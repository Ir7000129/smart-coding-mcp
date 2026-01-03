/**
 * Verse-specific chunking with indentation awareness
 * 
 * PURPOSE: Produces meaningful chunks for Verse code by:
 * - Recognizing multi-line function signatures (with effect specifiers like <transacts>, <decides>)
 * - Using indentation to determine block boundaries (Verse is indentation-based, not brace-based)
 * - Keeping @attributes attached to their definitions
 * - Supporting extension methods, classes, structs, interfaces, enums, modules
 * 
 * DESIGN PRINCIPLE: Keep it lightweight. We're not building a full Verse parser.
 * We just need to reliably identify "where does a chunk start?" so the search index
 * contains meaningful blocks of code rather than arbitrary line-based splits.
 */

import { estimateTokens, getChunkingParams } from "./tokenizer.js";

/**
 * Regex patterns for Verse definition detection
 * 
 * These patterns identify the START of definitions. They're intentionally permissive
 * about effect specifiers (<transacts>, <decides>, <suspends>, etc.) to avoid
 * missing function starts when new specifiers are used.
 */
const PATTERNS = {
    // Type definitions: name<specifiers> := class/struct/interface/enum<specifiers>:
    // Examples: 
    //   cmp_build_system := class(world_component):
    //   fguid<public> := struct<concrete><computes><persistable>:
    //   interface_power_node := interface:
    //   rotation_direction<public>:= enum{Left, Right}
    classOrStruct: /^(\s*)(\w+)(<[^>]+>)*\s*:=\s*(class|struct|interface|enum)/,

    // Module: name := module:
    moduleDecl: /^(\s*)(\w+)\s*:=\s*module:/,

    // Extension method: (Type).MethodName
    // Examples:
    //   (Array:[]t where t:type).Random<public>()<decides><transacts>:t =
    //   (Guid:fguid).IsValid<public>()<decides><transacts>:void=
    extensionStart: /^(\s*)\([^)]+\)\.(\w+)/,

    // Function definitions - capture opening paren for multi-line detection
    // Examples:
    //   Pack4Ints<public>(
    //   GetIsActive<public>()<transacts>:logic=
    //   OnGameStart<override>()<suspends>:void=
    // NOTE: The (<[^>]+>)* after the name captures specifiers like <public>, <override>
    functionStart: /^(\s*)(\w+)(<[^>]+>)?\s*\(/,

    // Single-line function (complete on one line) - ends with = after return type
    // Must have () and end with : ReturnType = (with possible effect specifiers)
    simpleFunction: /^(\s*)(\w+)(<[^>]+>)?\s*\([^)]*\)\s*(<[^>]+>)*\s*:\s*\S+\s*=\s*$/,

    // Multi-line signature completion patterns
    // ):type = (function with body)
    signatureEnd: /\)\s*(<[^>]+>)*\s*:\s*\S+\s*=\s*$/,
    // ):type (interface method - no body, no =)
    interfaceMethodEnd: /\)\s*(<[^>]+>)*\s*:\s*\S+\s*$/,

    // Attribute: @editable, @editable:, @customAttribute
    attribute: /^(\s*)@\w+/,

    // Skip patterns
    comment: /^(\s*)#/,
    using: /^(\s*)using\s*\{/,
    emptyOrWhitespace: /^\s*$/,
};

/**
 * Get the indentation level (number of spaces) for a line
 */
function getIndent(line) {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
}

/**
 * Check if a line is blank or comment-only (doesn't affect block boundaries)
 */
function isBlankOrComment(line) {
    return PATTERNS.emptyOrWhitespace.test(line) || PATTERNS.comment.test(line);
}

/**
 * Chunk a Verse file using indentation-aware parsing
 * 
 * @param {string} content - File content
 * @param {string} filePath - File path (for logging/debugging)
 * @param {object} config - Configuration with embeddingModel for token limits
 * @returns {Array<{text: string, startLine: number, endLine: number, tokenCount: number}>}
 */
export function chunkVerseFile(content, filePath, config) {
    const lines = content.split(/\r?\n/);
    const chunks = [];

    // Get model-specific chunking parameters
    const { targetTokens, overlapTokens } = getChunkingParams(config.embeddingModel);

    // State machine: IDLE, IN_SIGNATURE, IN_BODY
    let state = 'IDLE';
    let currentChunk = null;
    let attributeLines = [];  // Buffer @attribute lines before definition

    /**
     * Finalize the current chunk and add to results
     */
    function finalizeChunk(endLine) {
        if (!currentChunk) return;

        // Include buffered attributes at the start of the chunk
        if (attributeLines.length > 0) {
            currentChunk.startLine = attributeLines[0].lineNum;
            currentChunk.signatureLines = [
                ...attributeLines.map(a => a.text),
                ...currentChunk.signatureLines
            ];
        }

        const signature = currentChunk.signatureLines.join('\n').trim();
        const body = currentChunk.bodyLines.join('\n');
        const fullContent = signature + (body ? '\n' + body : '');
        const tokenCount = estimateTokens(fullContent);

        // Only add non-trivial chunks
        if (fullContent.trim().length > 20) {
            chunks.push({
                text: fullContent,
                startLine: currentChunk.startLine,
                endLine: endLine,
                tokenCount: tokenCount,
                type: currentChunk.type,
                // First line of signature, truncated for display
                signature: signature.split('\n')[0].trim().slice(0, 100)
            });
        }

        currentChunk = null;
        attributeLines = [];
    }

    /**
     * Create a new chunk builder
     */
    function startChunk(lineNum, line, indent, type, hasBody = false) {
        return {
            startLine: lineNum,
            signatureLines: [line],
            bodyLines: [],
            baseIndent: indent,
            type: type,
            hasBody: hasBody
        };
    }

    for (let i = 0; i < lines.length; i++) {
        const lineNum = i + 1;  // 1-indexed for output
        const line = lines[i];
        const indent = getIndent(line);

        // Skip using statements and top-level comments when IDLE
        if (state === 'IDLE') {
            if (PATTERNS.using.test(line) || PATTERNS.emptyOrWhitespace.test(line)) {
                continue;
            }
            if (PATTERNS.comment.test(line) && indent === 0) {
                continue;
            }
        }

        // ========================================
        // State: IN_BODY - accumulating body lines
        // ========================================
        if (state === 'IN_BODY') {
            // Block ends when we hit a non-blank line with <= base indent
            // (meaning same or lower indentation level than where we started)
            if (!isBlankOrComment(line) && indent <= currentChunk.baseIndent) {
                // This line is NOT part of the current chunk - finalize and process as new
                finalizeChunk(lineNum - 1);
                state = 'IDLE';
                // Fall through to process this line as a potential new definition
            } else {
                // Still in body - add line and continue
                currentChunk.bodyLines.push(line);
                continue;
            }
        }

        // =====================================================
        // State: IN_SIGNATURE - accumulating multi-line signature
        // =====================================================
        if (state === 'IN_SIGNATURE') {
            currentChunk.signatureLines.push(line);

            // Check if signature is complete
            if (PATTERNS.signatureEnd.test(line)) {
                // Signature ends with ): Type = → body follows
                currentChunk.hasBody = true;
                state = 'IN_BODY';
            } else if (PATTERNS.interfaceMethodEnd.test(line) && currentChunk.type === 'interface-method') {
                // Interface method ends with ): Type (no =) → no body
                finalizeChunk(lineNum);
                state = 'IDLE';
            }
            continue;
        }

        // =============================================
        // State: IDLE - looking for definition starts
        // =============================================
        if (state === 'IDLE') {
            // Buffer @attributes to attach to the next definition
            if (PATTERNS.attribute.test(line)) {
                attributeLines.push({ lineNum, text: line });
                continue;
            }

            // --------------------------------------
            // Check: Class/Struct/Interface/Enum
            // --------------------------------------
            let match = line.match(PATTERNS.classOrStruct);
            if (match) {
                currentChunk = startChunk(lineNum, line, match[1].length, match[4], true);

                // Single-line enum? e.g., rotation_direction<public>:= enum{Left, Right}
                if (match[4] === 'enum' && line.includes('{') && line.includes('}')) {
                    finalizeChunk(lineNum);
                } else {
                    state = 'IN_BODY';
                }
                continue;
            }

            // --------------------------------------
            // Check: Module declaration
            // --------------------------------------
            match = line.match(PATTERNS.moduleDecl);
            if (match) {
                currentChunk = startChunk(lineNum, line, match[1].length, 'module', true);
                state = 'IN_BODY';
                continue;
            }

            // --------------------------------------
            // Check: Extension method (Type).Method
            // --------------------------------------
            match = line.match(PATTERNS.extensionStart);
            if (match) {
                currentChunk = startChunk(lineNum, line, match[1].length, 'extension', false);

                // Check if complete on single line
                if (PATTERNS.signatureEnd.test(line)) {
                    currentChunk.hasBody = true;
                    state = 'IN_BODY';
                } else {
                    state = 'IN_SIGNATURE';
                }
                continue;
            }

            // --------------------------------------
            // Check: Simple single-line function
            // --------------------------------------
            match = line.match(PATTERNS.simpleFunction);
            if (match) {
                currentChunk = startChunk(lineNum, line, match[1].length, 'function', true);
                state = 'IN_BODY';
                continue;
            }

            // --------------------------------------
            // Check: Multi-line function (Name<spec>(...)
            // --------------------------------------
            match = line.match(PATTERNS.functionStart);
            if (match && !PATTERNS.simpleFunction.test(line)) {
                // Check if this looks like it could be inside an interface context
                // (we track if we're inside an interface by checking indentation later)
                const type = 'function';
                currentChunk = startChunk(lineNum, line, match[1].length, type, false);
                state = 'IN_SIGNATURE';
                continue;
            }

            // If we have buffered attributes but the next line isn't a definition, discard them
            if (attributeLines.length > 0 && !PATTERNS.attribute.test(line) && !isBlankOrComment(line)) {
                attributeLines = [];
            }
        }
    }

    // Finalize any remaining chunk at end of file
    if (currentChunk) {
        finalizeChunk(lines.length);
    }

    // Extract nested methods from class/struct chunks for better search granularity
    const chunksWithNested = extractNestedMethods(chunks);

    // Apply token-based splitting if any chunks exceed target tokens
    return applyTokenLimits(chunksWithNested, targetTokens, overlapTokens);
}

/**
 * Extract methods from class/struct chunks as separate searchable sub-chunks
 * Keeps the parent class chunk AND adds individual method chunks
 * 
 * @param {Array} chunks - Initial chunks from indentation parsing
 * @returns {Array} Chunks with nested methods extracted
 */
function extractNestedMethods(chunks) {
    const result = [];

    // Pattern to detect method definitions inside classes
    // Matches: MethodName<spec>(...)<effects>:ReturnType=
    const methodPattern = /^(\s+)(\w+)(<[^>]+>)?\s*\(/;
    const signatureEndPattern = /\)\s*(<[^>]+>)*\s*:\s*\S+\s*=\s*$/;

    for (const chunk of chunks) {
        // Always keep the parent chunk for class-level searches
        result.push(chunk);

        // Only extract nested methods from class/struct chunks
        if (chunk.type !== 'class' && chunk.type !== 'struct') {
            continue;
        }

        const lines = chunk.text.split('\n');
        if (lines.length < 3) continue; // Too small to have meaningful methods

        // Get parent class name for prefixing
        const classNameMatch = lines[0].match(/^\s*(\w+)/);
        const className = classNameMatch ? classNameMatch[1] : 'Unknown';
        const parentIndent = getIndent(lines[0]);

        let methodStart = -1;
        let methodLines = [];
        let methodIndent = -1;
        let inMethodSignature = false;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const indent = getIndent(line);
            const trimmed = line.trim();

            // Skip empty lines and comments when looking for method start
            if (!trimmed || trimmed.startsWith('#')) {
                if (methodStart !== -1) {
                    methodLines.push(line);
                }
                continue;
            }

            // Check if this is a method definition (indented more than class, matches pattern)
            const methodMatch = line.match(methodPattern);
            if (methodMatch && indent > parentIndent && methodStart === -1) {
                methodStart = i;
                methodIndent = indent;
                methodLines = [line];

                // Check if signature is complete on this line
                inMethodSignature = !signatureEndPattern.test(line);
                continue;
            }

            // Accumulating multi-line signature
            if (inMethodSignature && methodStart !== -1) {
                methodLines.push(line);
                if (signatureEndPattern.test(line)) {
                    inMethodSignature = false;
                }
                continue;
            }

            // In method body
            if (methodStart !== -1) {
                // Method ends when we hit a line at same or less indent than method start
                if (indent <= methodIndent && trimmed) {
                    // Finalize the method chunk
                    const methodText = methodLines.join('\n');
                    const methodNameMatch = methodLines[0].match(/^\s*(\w+)/);
                    const methodName = methodNameMatch ? methodNameMatch[1] : 'method';

                    if (methodText.trim().length > 20) {
                        result.push({
                            text: methodText,
                            startLine: chunk.startLine + methodStart,
                            endLine: chunk.startLine + methodStart + methodLines.length - 1,
                            tokenCount: estimateTokens(methodText),
                            type: 'method',
                            signature: `${className}::${methodLines[0].trim().slice(0, 80)}`,
                            parentClass: className
                        });
                    }

                    // Check if this line starts a new method
                    const newMethodMatch = line.match(methodPattern);
                    if (newMethodMatch && indent > parentIndent) {
                        methodStart = i;
                        methodIndent = indent;
                        methodLines = [line];
                        inMethodSignature = !signatureEndPattern.test(line);
                    } else {
                        methodStart = -1;
                        methodLines = [];
                        methodIndent = -1;
                    }
                } else {
                    methodLines.push(line);
                }
            }
        }

        // Finalize any remaining method at end of class
        if (methodStart !== -1 && methodLines.length > 0) {
            const methodText = methodLines.join('\n');
            const methodNameMatch = methodLines[0].match(/^\s*(\w+)/);
            const methodName = methodNameMatch ? methodNameMatch[1] : 'method';

            if (methodText.trim().length > 20) {
                result.push({
                    text: methodText,
                    startLine: chunk.startLine + methodStart,
                    endLine: chunk.startLine + methodStart + methodLines.length - 1,
                    tokenCount: estimateTokens(methodText),
                    type: 'method',
                    signature: `${className}::${methodLines[0].trim().slice(0, 80)}`,
                    parentClass: className
                });
            }
        }
    }

    return result;
}

/**
 * Split chunks that exceed token limits while trying to preserve semantic meaning
 * 
 * @param {Array} chunks - Initial chunks from indentation parsing
 * @param {number} targetTokens - Target token count per chunk
 * @param {number} overlapTokens - Token overlap between chunks
 * @returns {Array} Chunks respecting token limits
 */
function applyTokenLimits(chunks, targetTokens, overlapTokens) {
    const result = [];

    for (const chunk of chunks) {
        if (chunk.tokenCount <= targetTokens * 1.5) {
            // Chunk is within acceptable size
            result.push(chunk);
        } else {
            // Chunk is too large - split by lines while keeping signature
            const lines = chunk.text.split('\n');
            const signatureLine = chunk.signature || lines[0];

            let currentLines = [];
            let currentTokens = 0;
            let startLine = chunk.startLine;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const lineTokens = estimateTokens(line);

                if (currentTokens + lineTokens > targetTokens && currentLines.length > 0) {
                    // Output current chunk
                    const text = currentLines.join('\n');
                    result.push({
                        text: text,
                        startLine: startLine,
                        endLine: startLine + currentLines.length - 1,
                        tokenCount: currentTokens,
                        type: chunk.type,
                        signature: result.length === 0 ? signatureLine : `(continued) ${signatureLine}`
                    });

                    // Calculate overlap
                    let overlapLines = [];
                    let overlapCount = 0;
                    for (let j = currentLines.length - 1; j >= 0 && overlapCount < overlapTokens; j--) {
                        const lt = estimateTokens(currentLines[j]);
                        if (overlapCount + lt <= overlapTokens) {
                            overlapLines.unshift(currentLines[j]);
                            overlapCount += lt;
                        } else break;
                    }

                    currentLines = overlapLines;
                    currentTokens = overlapCount;
                    startLine = chunk.startLine + i - overlapLines.length;
                }

                currentLines.push(line);
                currentTokens += lineTokens;
            }

            // Add remaining
            if (currentLines.length > 0) {
                const text = currentLines.join('\n');
                if (text.trim().length > 20) {
                    result.push({
                        text: text,
                        startLine: startLine,
                        endLine: chunk.endLine,
                        tokenCount: currentTokens,
                        type: chunk.type,
                        signature: result.length === 0 ? signatureLine : `(continued) ${signatureLine}`
                    });
                }
            }
        }
    }

    return result;
}
