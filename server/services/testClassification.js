/**
 * Classification Service Test Suite
 * Tests for rule-based filename classification
 */

const {
    classifyByFilename,
    extractCategoryDigit,
    validateFilename,
    CLASSIFICATION_RULES
} = require('./classificationService');

console.log('🧪 Running Classification Service Tests\n');
console.log('═'.repeat(60));

// Test 1: Road Issue (Digit 1)
console.log('\n📋 TEST 1: Road Issue Detection');
const test1 = classifyByFilename('road_issue_1.jpg');
console.log('Filename: road_issue_1.jpg');
console.log('Result:', JSON.stringify(test1, null, 2));
console.log('✅ PASS:', test1.type === 'road' && test1.confidence === 1.0);

// Test 2: Garbage Issue (Digit 2)
console.log('\n📋 TEST 2: Garbage Issue Detection');
const test2 = classifyByFilename('garbage_2.png');
console.log('Filename: garbage_2.png');
console.log('Result:', JSON.stringify(test2, null, 2));
console.log('✅ PASS:', test2.type === 'garbage' && test2.confidence === 1.0);

// Test 3: Drainage Issue (Digit 3)
console.log('\n📋 TEST 3: Drainage Issue Detection');
const test3 = classifyByFilename('drainage_problem_3.jpg');
console.log('Filename: drainage_problem_3.jpg');
console.log('Result:', JSON.stringify(test3, null, 2));
console.log('✅ PASS:', test3.type === 'drainage' && test3.confidence === 1.0);

// Test 4: Miscellaneous/Blurred (Digit 4)
console.log('\n📋 TEST 4: Miscellaneous Detection');
const test4 = classifyByFilename('blurred_4.jpg');
console.log('Filename: blurred_4.jpg');
console.log('Result:', JSON.stringify(test4, null, 2));
console.log('✅ PASS:', test4.type === 'other' && test4.confidence === 1.0);

// Test 5: No Valid Digit
console.log('\n📋 TEST 5: No Valid Category Detection');
const test5 = classifyByFilename('random_image.jpg');
console.log('Filename: random_image.jpg');
console.log('Result:', JSON.stringify(test5, null, 2));
console.log('✅ PASS:', test5.confidence === 0.0 && test5.requiresManualReview === true);

// Test 6: Multiple Digits (First Valid Match)
console.log('\n📋 TEST 6: Multiple Digits (12.jpg)');
const test6 = classifyByFilename('pothole_12.jpg');
console.log('Filename: pothole_12.jpg');
console.log('Result:', JSON.stringify(test6, null, 2));
console.log('✅ PASS:', test6.type === 'road' && test6.confidence === 1.0);
console.log('Note: Uses first valid digit (1) → Road');

// Test 7: Extract Category Digit Function
console.log('\n📋 TEST 7: Extract Category Function');
console.log('Extract from "IMG_1234.jpg":', extractCategoryDigit('IMG_1234.jpg'));
console.log('Extract from "photo.jpg":', extractCategoryDigit('photo.jpg'));
console.log('Extract from "issue_3_urgent.png":', extractCategoryDigit('issue_3_urgent.png'));

// Test 8: Filename Validation
console.log('\n📋 TEST 8: Filename Validation');
const validation1 = validateFilename('road_issue_1.jpg');
console.log('Valid filename:', validation1);
const validation2 = validateFilename('../../../etc/passwd');
console.log('Malicious filename:', validation2);
console.log('✅ PASS:', validation2.isMalicious === true);

// Test 9: Edge Cases
console.log('\n📋 TEST 9: Edge Cases');
console.log('Null filename:', classifyByFilename(null).requiresManualReview);
console.log('Empty string:', classifyByFilename('').requiresManualReview);
console.log('Digit 5 (invalid):', classifyByFilename('issue_5.jpg').confidence);
console.log('Digit 9 (invalid):', classifyByFilename('complaint_9.png').requiresManualReview);

// Summary
console.log('\n' + '═'.repeat(60));
console.log('✅ All Tests Complete!');
console.log('\n📊 Classification Rules:');
Object.entries(CLASSIFICATION_RULES).forEach(([digit, rule]) => {
    console.log(`   ${digit} → ${rule.category} (${rule.type})`);
});

console.log('\n🎯 Demo Stability: 100% Deterministic');
console.log('🔧 Future Upgrade: Feature flag ready for AI');
console.log('═'.repeat(60));
