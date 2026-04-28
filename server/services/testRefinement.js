/**
 * DIAGNOSIS & REFINEMENT TEST
 * Testing why "timestamped" images fail and verifying "Standalone Digit" fix
 */

const { CLASSIFICATION_RULES } = require('./classificationService');

// 1. Current Logic Simulation
function currentLogic(filename) {
    const digits = filename.match(/\d/g) || [];
    for (const digit of digits) {
        if (['1', '2', '3', '4'].includes(digit)) return digit;
    }
    return null;
}

// 2. Proposed "Standalone Digit" Logic
function proposedLogic(filename) {
    // Look for 1-4 that are NOT surrounded by other digits
    // Matches: " 1 ", "_1_", "1.", "-1-", "path/1.jpg"
    // Ignores: "2024", "123", "v1.2"

    const regex = /(?:^|[^0-9])([1-4])(?:[^0-9]|$)/;
    const match = filename.match(regex);
    return match ? match[1] : null;
}

const testCases = [
    { name: 'Standard Naming', file: 'drainage_3.jpg', intended: '3' },
    { name: 'Timestamped (Problem)', file: 'uploaded_media_1769307075422.jpg', intended: '3' }, // User case: Has 1 (Road) & 2 (Garbage)
    { name: 'Year Prefix', file: 'IMG_20240125_3.jpg', intended: '3' }, // Has 2 (Garbage)
    { name: 'Mixed Digits', file: 'issue_123.jpg', intended: null }, // Ambiguous, should probably be null or specific
    { name: 'Explicit Underscore', file: 'garbage_pile_2.jpg', intended: '2' },
    { name: 'Start of String', file: '3_drainage.jpg', intended: '3' },
    { name: 'Inside Text', file: 'pothole 1 detected.jpg', intended: '1' },
    { name: 'Year Only', file: '2025.jpg', intended: null } // Should NOT be Garbage
];

console.log('🧪 LOGIC COMPARISON TEST\n');
console.log('Filename'.padEnd(35) + ' | ' + 'Intended'.padEnd(8) + ' | ' + 'Current'.padEnd(8) + ' | ' + 'Proposed'.padEnd(8));
console.log('-'.repeat(70));

testCases.forEach(test => {
    const current = currentLogic(test.file);
    const proposed = proposedLogic(test.file);

    const currentRes = current ? CLASSIFICATION_RULES[current].category.split(' ')[0] : 'None';
    const proposedRes = proposed ? CLASSIFICATION_RULES[proposed].category.split(' ')[0] : 'None';
    const IntendedRes = test.intended ? CLASSIFICATION_RULES[test.intended].category.split(' ')[0] : 'None';

    console.log(
        test.file.padEnd(35) + ' | ' +
        IntendedRes.padEnd(8) + ' | ' +
        (current === test.intended ? '✅ ' : '❌ ') + currentRes.padEnd(6) + ' | ' +
        (proposed === test.intended ? '✅ ' : '⚠️ ') + proposedRes
    );
});

console.log('\n🧠 ANALYSIS:');
console.log('Current logic aggressively grabs the first digit found.');
console.log('Proposed logic only grabs a digit if it is ISOLATED (not part of a larger number).');
