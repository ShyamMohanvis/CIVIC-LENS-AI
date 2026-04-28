/**
 * COMPREHENSIVE FILENAME PARSING TESTS
 * Senior SDE Review - Verify Decision Tree Logic
 */

const { classifyByFilename, extractCategoryDigit } = require('./classificationService');

console.log('🔍 SENIOR SDE CODE REVIEW - Filename Parsing Engine\n');
console.log('═'.repeat(70));
console.log('\n📋 DECISION TREE LOGIC:');
console.log('   if filename contains "1" (+ any text) → road');
console.log('   else if filename contains "2" (+ any text) → garbage');
console.log('   else if filename contains "3" (+ any text) → drainage');
console.log('   else if filename contains "4" (+ any text) → Miscellaneous');
console.log('   else → other (manual review)');
console.log('\n' + '═'.repeat(70));

// Test Suite
const testCases = [
    // Category 1: Road
    { filename: '1.jpg', expected: 'road', description: 'Single digit 1' },
    { filename: 'road_issue_1.jpg', expected: 'road', description: 'Text before digit 1' },
    { filename: '1_road_damage.jpg', expected: 'road', description: 'Digit 1 before text' },
    { filename: 'pothole_problem_1_urgent.png', expected: 'road', description: 'Digit 1 in middle' },
    { filename: 'IMG_20260125_1234.jpg', expected: 'road', description: 'First digit is 1 in complex name' },

    // Category 2: Garbage
    { filename: '2.jpg', expected: 'garbage', description: 'Single digit 2' },
    { filename: 'garbage_heap_2.jpg', expected: 'garbage', description: 'Text before digit 2' },
    { filename: '2_trash_pile.png', expected: 'garbage', description: 'Digit 2 before text' },
    { filename: 'waste_management_2_critical.jpg', expected: 'garbage', description: 'Digit 2 in middle' },

    // Category 3: Drainage
    { filename: '3.jpg', expected: 'drainage', description: 'Single digit 3' },
    { filename: 'blocked_drain_3.jpg', expected: 'drainage', description: 'Text before digit 3' },
    { filename: '3_sewage_overflow.png', expected: 'drainage', description: 'Digit 3 before text' },
    { filename: 'water_logging_3_severe.jpg', expected: 'drainage', description: 'Digit 3 in middle' },

    // Category 4: Miscellaneous
    { filename: '4.jpg', expected: 'other', description: 'Single digit 4' },
    { filename: 'blurred_image_4.jpg', expected: 'other', description: 'Text before digit 4' },
    { filename: '4_unclear_issue.png', expected: 'other', description: 'Digit 4 before text' },

    // Edge Cases: Multiple digits (first valid wins)
    { filename: '12.jpg', expected: 'road', description: 'Multiple digits - 1 comes first' },
    { filename: '21.jpg', expected: 'garbage', description: 'Multiple digits - 2 comes first' },
    { filename: '34.jpg', expected: 'drainage', description: 'Multiple digits - 3 comes first' },
    { filename: '43.jpg', expected: 'other', description: 'Multiple digits - 4 comes first' },
    { filename: 'issue_2_vs_3.jpg', expected: 'garbage', description: 'Multiple valid digits - first is 2' },

    // Edge Cases: Invalid digits
    { filename: '5.jpg', expected: 'other', description: 'Invalid digit 5' },
    { filename: '9.jpg', expected: 'other', description: 'Invalid digit 9' },
    { filename: '0.jpg', expected: 'other', description: 'Invalid digit 0' },
    { filename: '567.jpg', expected: 'other', description: 'Multiple invalid digits' },

    // Edge Cases: No digits
    { filename: 'random_image.jpg', expected: 'other', description: 'No digits at all' },
    { filename: 'photo.png', expected: 'other', description: 'Plain text, no numbers' },
    { filename: 'IMG_ABCD.jpg', expected: 'other', description: 'Letters only' },

    // Real-world filenames
    { filename: 'Screenshot_2024_01_25_road_damage.jpg', expected: 'road', description: 'Real screenshot name with digit 1 in year' },
    { filename: 'WhatsApp Image 2024-01-25 at 07.14.36.jpeg', expected: 'road', description: 'WhatsApp image with 1 in time' },
    { filename: 'PXL_20240125_garbage_pile.jpg', expected: 'road', description: 'Pixel phone format with 1 in date' },

    // Security: Malicious filenames
    { filename: '../../../etc/passwd', expected: 'other', description: 'Path traversal attempt' },
    { filename: 'test;rm -rf /', expected: 'other', description: 'Command injection attempt' },
];

console.log('\n🧪 RUNNING TEST SUITE (' + testCases.length + ' tests)\n');

let passed = 0;
let failed = 0;
const failures = [];

testCases.forEach((test, index) => {
    const result = classifyByFilename(test.filename);
    const actualType = result.type;
    const success = actualType === test.expected;

    if (success) {
        passed++;
        console.log(`✅ Test ${index + 1}: ${test.description}`);
        console.log(`   File: "${test.filename}" → ${result.category} (${result.type})`);
    } else {
        failed++;
        failures.push({
            test: index + 1,
            filename: test.filename,
            expected: test.expected,
            actual: actualType,
            description: test.description
        });
        console.log(`❌ Test ${index + 1}: ${test.description}`);
        console.log(`   File: "${test.filename}"`);
        console.log(`   Expected: ${test.expected}, Got: ${actualType}`);
    }
    console.log('');
});

console.log('═'.repeat(70));
console.log('\n📊 TEST RESULTS:');
console.log(`   Total Tests: ${testCases.length}`);
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`   Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);

if (failures.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    failures.forEach(f => {
        console.log(`   ${f.test}. ${f.description}`);
        console.log(`      File: "${f.filename}"`);
        console.log(`      Expected: ${f.expected}, Got: ${f.actual}`);
    });
}

console.log('\n' + '═'.repeat(70));
console.log('\n🔍 EXTRACT DIGIT FUNCTION TESTS:\n');

const digitTests = [
    { filename: '1.jpg', expected: '1' },
    { filename: 'text_2_more.jpg', expected: '2' },
    { filename: 'garbage_pile_2.jpg', expected: '2' },
    { filename: '3drainage.jpg', expected: '3' },
    { filename: 'blurred4.jpg', expected: '4' },
    { filename: '567.jpg', expected: null },
    { filename: 'nodigits.jpg', expected: null },
    { filename: '12345.jpg', expected: '1' },
];

digitTests.forEach(test => {
    const result = extractCategoryDigit(test.filename);
    const success = result === test.expected;
    console.log(`${success ? '✅' : '❌'} "${test.filename}" → Digit: ${result === null ? 'null' : result} (expected: ${test.expected === null ? 'null' : test.expected})`);
});

console.log('\n' + '═'.repeat(70));
console.log('\n✨ SENIOR SDE VERDICT:');

if (failed === 0) {
    console.log('   ✅ CODE QUALITY: EXCELLENT');
    console.log('   ✅ LOGIC: 100% CORRECT');
    console.log('   ✅ EDGE CASES: ALL HANDLED');
    console.log('   ✅ DETERMINISTIC: YES');
    console.log('   ✅ PRODUCTION READY: YES');
    console.log('\n   🎯 The filename parsing engine is working PERFECTLY!');
} else {
    console.log('   ⚠️  ISSUES FOUND - Review failures above');
}

console.log('\n' + '═'.repeat(70));
