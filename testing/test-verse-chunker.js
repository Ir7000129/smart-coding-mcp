/**
 * Test script for the Verse chunker
 * Writes output to test-output.txt
 */

import { chunkVerseFile } from '../lib/verse-chunker.js';
import fs from 'fs';

// Sample Verse code with various patterns that should be handled correctly
const sampleVerseCode = `using { /Fortnite.com/Devices }
using { /UnrealEngine.com/Temporary/SpatialMath }

# A simple enum (single-line)
rotation_direction<public>:= enum{Left, Right}

# A struct with multiple specifiers
fguid<public> := struct<concrete><computes><persistable>:
    Meta : int = 0 
    Val : int = 0

# Multi-line function with effect specifiers
Pack4Ints<public>(
    A: int,
    B: int,
    C: int,
    D: int
)<decides><transacts>: int =
    # Pack 4 integers into one
    result := A + B + C + D
    result

# Extension method
(Array:[]t where t:type).Random<public>()<decides><transacts>:t =
    Array[GetRandomInt(0, Array.Length - 1)]

# Class with methods
custom_timer<public> := class<concrete>:
    @editable
    TimerTick<public> : float = 1.0
    
    var CurrentTime<public> : float = 0.0
    
    GetIsActive<public>()<transacts>:logic=
        IsActive
    
    StartTimer<public>(?MaybeDuration:float = 0.0)<suspends>:void=
        loop:
            Sleep(TimerTick)
            set CurrentTime += TimerTick
            if (CurrentTime > MaybeDuration):
                break

# Interface definition
interface_power_node := interface:
    GetBasePowerOutput()<reads>:float
    GetEfficiency()<reads>:float
    GetPriority()<reads>:int
    IsPowered()<reads>:logic

# Class implementing interface
cmp_build_system := class(world_component, interface_build_system):
    @editable:
        Categories := array{InputsMessage}
    Prop_Place : ?input_trigger_device = false
    
    OnGameStart<override>()<suspends>:void=
        (super:)OnGameStart()
        # Initialize the build system
        Log("Build system initialized")
`;

// Config object (mock)
const mockConfig = {
    embeddingModel: 'nomic-embed-text-v1.5'
};

let output = '';
output += '=== Testing Verse Chunker ===\n\n';

const chunks = chunkVerseFile(sampleVerseCode, 'test.verse', mockConfig);

output += 'Found ' + chunks.length + ' chunks:\n\n';

for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    output += '--- Chunk ' + (i + 1) + ' ---\n';
    output += 'Type: ' + chunk.type + '\n';
    output += 'Lines: ' + chunk.startLine + '-' + chunk.endLine + '\n';
    output += 'Tokens: ' + chunk.tokenCount + '\n';
    output += 'Signature: ' + chunk.signature + '\n';
    output += 'Content:\n```\n' + chunk.text + '\n```\n\n';
}

output += '=== Test Complete ===\n';

fs.writeFileSync('test-output.txt', output);
console.log('Output written to test-output.txt');
