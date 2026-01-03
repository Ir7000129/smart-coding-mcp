# Verse Code Chunking Implementation Specification

**Date**: 2026-01-03
**Purpose**: Provide AI agent with complete specification to implement improved Verse chunking in `smart-coding-mcp`
**Target File**: `lib/utils.js` → `getFileChunks()` function, language patterns

---

## Executive Summary

The current regex-based Verse chunking in smart-coding-mcp produces fragmented, incomplete chunks because Verse is an **indentation-based language** with **multi-line signatures**. This specification provides:

1. **Real "Code Breaker" examples** from production codebase
2. **Complete list of Verse syntax patterns** requiring special handling
3. **Solution architecture** for stateful parsing
4. **JavaScript implementation** ready for integration

---

## Part 1: Real Code Breaker Examples

### Code Breaker 1: Multi-Line Function Signatures with Effect Specifiers

**Current regex fails because signature spans 5+ lines:**

```verse
# From int_packing.verse (lines 69-74)
Pack4Ints<public>(
    A: int,
    B: int,
    C: int,
    D: int
)<decides><transacts>: int =
```

```verse
# From game_utility2.verse (lines 44-47)
LocalRotation<public>(
    worldRotation: (/UnrealEngine.com/Temporary/SpatialMath:)rotation,
    refTransform: (/UnrealEngine.com/Temporary/SpatialMath:)transform
)<decides><transacts>:(/UnrealEngine.com/Temporary/SpatialMath:)rotation =
```

```verse
# From game_utility2.verse (lines 293-298)
PackTransform(
    Pos: vector3,
    Rot: rotation,
    Scale: float,
    GridSize: vector3
)<decides><transacts>: int =
```

**Pattern**: `Name<specifiers>(` → newlines with indented args → `)<effects>: ReturnType =`

---

### Code Breaker 2: Attribute Gap (Attribute separated from definition)

**Current regex loses connection between @attribute and definition:**

```verse
# From property_build_system.verse (lines 24-26)
    @editable:
        Categories := array{InputsMessage}
    Prop_Place : ?input_trigger_device = false
```

```verse
# From property_build_system.verse (lines 47-49)
    # Description: Ghost material applied during prop move/place
    # Purpose: Shows translucent preview while moving
    @editable
    PropPreviewMaterial : Material.Property.M_PropPreviewPlace = Material.Property.M_PropPreviewPlace{}
```

```verse
# From game_utility.verse (lines 240-242)
    custom_timer<public> := class<concrete>:
        @editable
        TimerTick<public> : float = 1.0
```

**Pattern**: `@attribute` → optional comments → actual field/class definition

---

### Code Breaker 3: Indentation Masquerade (Methods vs Global Functions)

**Current regex treats class methods as global functions:**

```verse
# From game_utility.verse (lines 240-261)
    custom_timer<public> := class<concrete>:
        @editable
        TimerTick<public> : float = 1.0
        TimerFinishedEvent<public> : custom_subscribable(float) = custom_subscribable(float){}
        var CurrentTime<public> : float = 0.0
        
        GetIsActive<public>()<transacts>:logic=
            IsActive
        StartTimer<public>(?MaybeDuration:float = 0.0)<suspends>:void=
            # ...body
```

```verse
# From property_build_system.verse (lines 22-71)
cmp_build_system := class(world_component, interface_build_system):

    @editable:
        Categories := array{InputsMessage}
    Prop_Place : ?input_trigger_device = false
    # ... more fields ...
    
    OnGameStart<override>()<suspends>:void=
        (super:)OnGameStart()
        # ... body spans 15+ lines
```

**Pattern**: Class definition at indent 0 → Methods at indent 4 (one level deeper)

---

### Code Breaker 4: Interface Definitions

**Interfaces have methods without bodies (no `=` at end):**

```verse
# From Data_Props_Interface.verse (lines 9-16)
interface_power_node := interface:
    GetBasePowerOutput()<reads>:float
    GetEfficiency()<reads>:float
    GetPriority()<reads>:int
    IsPowered()<reads>:logic
    SetPowered(On:logic):void
    GetAvailableEnergy()<reads>:float
    ConsumeEnergy(Amount:float):void
```

```verse
# From interfaces.verse (lines 12-16)
interface_general<public> := interface<unique><castable>:
    GetGeneralInterface()<reads>:general_type
    SetGeneralValue(Value:int):void
```

**Pattern**: Interface methods end with `:ReturnType` (no `=`), not `:ReturnType =`

---

### Code Breaker 5: Extension Methods (Modified Self Type)

**Special syntax for extending types with methods:**

```verse
# From game_utility.verse (line 97)
    (Array:[]t where t:type).Random<public>()<decides><transacts>:t =
        Array[GetRandomInt(0, Array.Length - 1)]
```

```verse
# From game_utility.verse (lines 216-222)
    (Map:[t]u where t:subtype(comparable), u:type).PopKey<public>(KeyToRemove:t)<decides><transacts>:tuple([t]u, u)=
        var AdjustedMap:[t]u = map{}
        # ...body
```

```verse
# From game_utility.verse (line 529)
    (Guid:fguid).IsValid<public>()<decides><transacts>:void=
        Guid.Val <> 0
```

**Pattern**: `(SelfType:Type).MethodName<spec>(...)<effects>:Return =`

---

### Code Breaker 6: Struct Definitions with Multiple Specifiers

```verse
# From game_utility.verse (line 470)
    fguid<public> := struct<concrete><computes><persistable>:
        Meta : int = 0 
        Val : int = 0
```

```verse
# From verse_reference.verse (line 43)
my_persistent_class<public> := class<final><persistable>:
    PersistentValue : int = 0
```

**Pattern**: `Name<spec> := (class|struct|interface)<spec><spec>...:` 

---

### Code Breaker 7: Enum Definitions

```verse
# From game_utility.verse (line 68)
    rotation_direction<public>:= enum{Left, Right}
```

```verse
# From World.verse (line 29)
epoi := enum<open>:
    None
    House
    # ...values
```

**Pattern**: `Name<spec> := enum{...}` (single line) OR `Name<spec> := enum<spec>:` (multi-line)

---

### Code Breaker 8: Override Methods with Multiple Effect Specifiers

```verse
# From property_build_system.verse (line 57)
    OnGameStart<override>()<suspends>:void=
```

```verse
# From UIManager.verse (line 121)
        GetEntity<override>()<decides><transacts>:entity=
```

```verse
# From missionstart.verse (line 24)
    OnStarted<override>(Agent:agent)<transacts><decides>:void=
```

**Pattern**: `Name<override>(...)<effect1><effect2>:Return=`

---

### Code Breaker 9: Constants with Fully Qualified Paths

```verse
# From game_utility.verse (lines 475-476)
    ShiftTag<internal> : int = 281474976710656 # 2^48
    ShiftCohort<internal> : int = 4294967296   # 2^32
```

```verse
# From int_packing.verse (lines 60-61)
PACK_BITS_PER_INT : int = 16
PACK_MAX_PER_INT : int = 65535  # 2^16 - 1
```

**Pattern**: Field with `<internal>` or `<public>` visibility specifier

---

## Part 2: Complete Verse Syntax Patterns

### 2.1 Definition Starters (What begins a chunk)

| Pattern | Example | Regex Hint |
|---------|---------|------------|
| Class | `name := class:` | `^\s*\w+(<[^>]+>)*\s*:=\s*class` |
| Class with parent | `name := class(parent):` | `^\s*\w+(<[^>]+>)*\s*:=\s*class\([^)]+\):` |
| Struct | `name := struct:` | `^\s*\w+(<[^>]+>)*\s*:=\s*struct` |
| Interface | `name := interface:` | `^\s*\w+(<[^>]+>)*\s*:=\s*interface` |
| Enum | `name := enum{...}` | `^\s*\w+(<[^>]+>)*\s*:=\s*enum` |
| Function | `Name(...):Return =` | `^\s*\w+(<[^>]+>)?\s*\([^)]*\)` (multi-line aware) |
| Extension | `(Self:Type).Name()` | `^\s*\([^)]+\)\.\w+` |
| Module | `module_name := module:` | `^\s*\w+\s*:=\s*module:` |

### 2.2 Effect Specifiers (Can appear in any order)

| Specifier | Purpose |
|-----------|---------|
| `<public>` | Visibility |
| `<private>` | Visibility |
| `<internal>` | Visibility |
| `<override>` | Method override |
| `<decides>` | Failable function |
| `<transacts>` | Transaction context |
| `<suspends>` | Async function |
| `<computes>` | Pure function |
| `<reads>` | Read-only |
| `<varies>` | Non-deterministic |
| `<converges>` | Termination guarantee |
| `<native>` | Engine binding |
| `<localizes>` | Localizable string |
| `<concrete>` | Class specifier |
| `<abstract>` | Class specifier |
| `<final>` | Class specifier |
| `<unique>` | Interface specifier |
| `<castable>` | Interface specifier |
| `<persistable>` | Persistence specifier |
| `<epic_internal>` | Epic internal |
| `<final_super>` | Final superclass |

### 2.3 Indentation Rules

- **Tab = 4 spaces** (Verse standard)
- **Block ends** when a line has **equal or less** indentation than block start
- **Empty lines** and **comment-only lines** do NOT end blocks
- **Continuation** (lines with only `)` or `}`) maintain parent indentation

---

## Part 3: Solution Architecture

### 3.1 State Machine Design

```
States:
  IDLE          → Looking for definition start
  IN_SIGNATURE  → Accumulating multi-line signature
  IN_BODY       → Accumulating body until dedent
  IN_ATTRIBUTE  → Just saw @attribute, waiting for definition
```

### 3.2 Key Data Structures

```javascript
// Chunk being built
interface ChunkBuilder {
  startLine: number;        // First line of chunk (1-indexed)
  signatureLines: string[]; // All lines of signature
  bodyLines: string[];      // All lines of body
  baseIndent: number;       // Indentation of definition start
  type: string;             // 'class', 'function', 'interface', etc.
  hasBody: boolean;         // false for interface methods
}

// Final output
interface Chunk {
  startLine: number;
  endLine: number;
  type: string;
  signature: string;        // Collapsed from signatureLines
  content: string;          // Full chunk text
}
```

---

## Part 4: JavaScript Implementation

```javascript
/**
 * Verse-specific chunking with indentation awareness
 * Handles multi-line signatures and nested class definitions
 */
function chunkVerseFile(content, filePath) {
  const lines = content.split(/\r?\n/);
  const chunks = [];
  
  // Regex patterns for definition detection
  const patterns = {
    // Type definitions
    classOrStruct: /^(\s*)(\w+)(<[^>]+>)*\s*:=\s*(class|struct|interface|enum)/,
    moduleDecl: /^(\s*)(\w+)\s*:=\s*module:/,
    
    // Function definitions (captures opening paren)
    functionStart: /^(\s*)(\w+)(<[^>]+>)?\s*\(/,
    extensionStart: /^(\s*)\(([^)]+)\)\.(\w+)/,
    
    // Signature continuation/completion
    signatureEnd: /\)\s*(<[^>]+>)*\s*:\s*\S+\s*=\s*$/,  // ):type =
    interfaceMethodEnd: /\)\s*(<[^>]+>)*\s*:\s*\S+\s*$/,  // ):type (no =)
    
    // Simple single-line patterns
    simpleFunction: /^(\s*)(\w+)(<[^>]+>)?\s*\([^)]*\)\s*(<[^>]+>)*\s*:\s*\S+\s*=$/,
    constantOrField: /^(\s*)(\w+)(<[^>]+>)?\s*:\s*\S+\s*=\s*\S/,
    
    // Attributes
    attribute: /^(\s*)@\w+/,
    
    // Skip patterns
    comment: /^(\s*)#/,
    using: /^(\s*)using\s*{/,
    emptyOrWhitespace: /^\s*$/,
  };

  let state = 'IDLE';
  let currentChunk = null;
  let attributeLines = [];  // Buffer for @attribute before definition
  
  function getIndent(line) {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }
  
  function isBlankOrComment(line) {
    return patterns.emptyOrWhitespace.test(line) || patterns.comment.test(line);
  }
  
  function finalizeChunk(endLine) {
    if (currentChunk) {
      // Include buffered attributes
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
      
      chunks.push({
        startLine: currentChunk.startLine,
        endLine: endLine,
        type: currentChunk.type,
        signature: signature.split('\n')[0].trim().slice(0, 100), // First line, truncated
        content: fullContent
      });
      
      currentChunk = null;
      attributeLines = [];
    }
  }
  
  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;  // 1-indexed
    const line = lines[i];
    const indent = getIndent(line);
    const trimmed = line.trim();
    
    // Skip using statements and top-level comments when IDLE
    if (state === 'IDLE') {
      if (patterns.using.test(line) || patterns.emptyOrWhitespace.test(line)) {
        continue;
      }
      if (patterns.comment.test(line) && indent === 0) {
        continue;
      }
    }
    
    // State: IN_BODY - check for block end
    if (state === 'IN_BODY') {
      // Block ends when we hit a non-blank line with <= base indent
      if (!isBlankOrComment(line) && indent <= currentChunk.baseIndent) {
        // This line is not part of current chunk
        finalizeChunk(lineNum - 1);
        state = 'IDLE';
        // Fall through to process this line as new definition
      } else {
        // Still in body
        currentChunk.bodyLines.push(line);
        continue;
      }
    }
    
    // State: IN_SIGNATURE - accumulating multi-line signature
    if (state === 'IN_SIGNATURE') {
      currentChunk.signatureLines.push(line);
      
      // Check if signature is complete
      if (patterns.signatureEnd.test(line)) {
        // Signature complete, body follows
        currentChunk.hasBody = true;
        state = 'IN_BODY';
      } else if (patterns.interfaceMethodEnd.test(line) && currentChunk.type === 'interface') {
        // Interface method - no body
        finalizeChunk(lineNum);
        state = 'IDLE';
      }
      continue;
    }
    
    // State: IDLE - looking for new definitions
    if (state === 'IDLE') {
      // Buffer @attributes
      if (patterns.attribute.test(line)) {
        attributeLines.push({ lineNum, text: line });
        continue;
      }
      
      // Class/Struct/Interface/Enum
      let match = line.match(patterns.classOrStruct);
      if (match) {
        currentChunk = {
          startLine: lineNum,
          signatureLines: [line],
          bodyLines: [],
          baseIndent: match[1].length,
          type: match[4],  // 'class', 'struct', 'interface', 'enum'
          hasBody: true
        };
        
        // Single-line enum? enum{Left, Right}
        if (match[4] === 'enum' && line.includes('{') && line.includes('}')) {
          finalizeChunk(lineNum);
        } else {
          state = 'IN_BODY';
        }
        continue;
      }
      
      // Module
      match = line.match(patterns.moduleDecl);
      if (match) {
        currentChunk = {
          startLine: lineNum,
          signatureLines: [line],
          bodyLines: [],
          baseIndent: match[1].length,
          type: 'module',
          hasBody: true
        };
        state = 'IN_BODY';
        continue;
      }
      
      // Extension method: (Type).Method
      match = line.match(patterns.extensionStart);
      if (match) {
        currentChunk = {
          startLine: lineNum,
          signatureLines: [line],
          bodyLines: [],
          baseIndent: match[1].length,
          type: 'extension',
          hasBody: false
        };
        
        // Check if single line
        if (patterns.signatureEnd.test(line)) {
          currentChunk.hasBody = true;
          state = 'IN_BODY';
        } else {
          state = 'IN_SIGNATURE';
        }
        continue;
      }
      
      // Simple single-line function
      match = line.match(patterns.simpleFunction);
      if (match) {
        currentChunk = {
          startLine: lineNum,
          signatureLines: [line],
          bodyLines: [],
          baseIndent: match[1].length,
          type: 'function',
          hasBody: true
        };
        state = 'IN_BODY';
        continue;
      }
      
      // Multi-line function (starts with Name( on this line)
      match = line.match(patterns.functionStart);
      if (match && !patterns.simpleFunction.test(line)) {
        currentChunk = {
          startLine: lineNum,
          signatureLines: [line],
          bodyLines: [],
          baseIndent: match[1].length,
          type: 'function',
          hasBody: false
        };
        state = 'IN_SIGNATURE';
        continue;
      }
      
      // If we have buffered attributes but no definition followed, clear them
      if (attributeLines.length > 0 && !patterns.attribute.test(line) && !isBlankOrComment(line)) {
        // The next non-attribute, non-blank line gets the attributes
        // But if it's not a definition, discard them
        attributeLines = [];
      }
    }
  }
  
  // Finalize any remaining chunk
  if (currentChunk) {
    finalizeChunk(lines.length);
  }
  
  return chunks;
}

// Export for integration
module.exports = { chunkVerseFile };
```

---

## Part 5: Integration Instructions

### 5.1 File to Modify

**Path**: `smart-coding-mcp/lib/utils.js`

**Current Verse pattern** (line ~144):
```javascript
verse: /^(class|struct|interface|enum|module)\s+\w+|^\w+(<[^>]+>)?(\(.*\))(\s*<[^>]+>)?\s*(:|:=|=)/
```

### 5.2 Changes Required

1. **Add new import at top of utils.js**:
```javascript
const { chunkVerseFile } = require('./verse-chunker');
```

2. **Modify `getFileChunks()` function** to use custom chunker for `.verse` files:
```javascript
function getFileChunks(content, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  // Use specialized Verse chunker
  if (ext === '.verse') {
    return chunkVerseFile(content, filePath);
  }
  
  // ... existing logic for other languages
}
```

3. **Create new file**: `smart-coding-mcp/lib/verse-chunker.js` with the implementation above

### 5.3 Testing

Test with these files from the analyzed codebase:
- `int_packing.verse` - Multi-line function signatures
- `game_utility.verse` - Extension methods, nested classes
- `property_build_system.verse` - Class with many methods, @editable attributes
- `Data_Props_Interface.verse` - Interface definitions
- `verse_reference.verse` - All pattern variations

---

## Part 6: Expected Improvements

| Before | After |
|--------|-------|
| `Pack4Ints<public>(` detected as partial | Complete `Pack4Ints` function with full body |
| Class methods treated as top-level | Methods properly nested within class context |
| `@editable` disconnected from field | Attribute grouped with its definition |
| Interface methods missing | Full interface with all method signatures |
| Extension methods invisible | `(Type).Method` captured as complete chunks |

---

## Appendix: Sample Output

For `int_packing.verse`, expected chunks:
```json
[
  {
    "startLine": 23,
    "endLine": 31,
    "type": "function",
    "signature": "ModInt<public>(A: int, B: int)<transacts>: int ="
  },
  {
    "startLine": 35,
    "endLine": 42,
    "type": "function",
    "signature": "QuotientInt<public>(A: int, B: int)<transacts>: int ="
  },
  {
    "startLine": 69,
    "endLine": 85,
    "type": "function",
    "signature": "Pack4Ints<public>("
  }
]
```
