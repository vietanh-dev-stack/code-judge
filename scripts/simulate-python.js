const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_URL = 'http://localhost:3000/submissions';
const USER_ID = 'e953dfb60654c58fc82dc9a5';
const PROBLEM_ID = '95262940-28c9-4233-93d5-37a28fa4aac8';
const LANGUAGE = 'PYTHON'; // ID 71

const SOURCE_CODE = `
import sys123
line = sys.stdin.readline()
if line:
    a, b = map(int, line.split())
    print(a + b)
`;

async function simulate() {
    console.log(`🚀 Đang mô phỏng gửi code PYTHON cho User: ${USER_ID}...`);
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: USER_ID,
                problemId: PROBLEM_ID,
                mode: 'ALGO',
                language: 'PYTHON', // Core-api will map this
                sourceCode: SOURCE_CODE
            }),
        });

        const data = await response.json();
        console.log('✅ Thành công! Phản hồi từ API:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    }
}

simulate();
