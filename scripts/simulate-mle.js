const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PROBLEM_ID = 'seed-problem-easy-02';
const CONTEST_ID = 'seed-contest-spring';
const USER_ID = 'seed-user-student';

async function submitCode(title, sourceCode) {
  const payload = {
    userId: USER_ID,
    problemId: PROBLEM_ID,
    contestId: CONTEST_ID,
    mode: 'ALGO',
    language: 'PYTHON',
    sourceCode: sourceCode,
    isDryRun: false,
  };

  try {
    console.log(`🚀 Đang mô phỏng gửi code: ${title}...`);
    const response = await axios.post(`${BASE_URL}/submissions`, payload);
    console.log('✅ Thành công! Phản hồi từ API:', JSON.stringify(response.data, null, 2));
    console.log('Đang chờ 5 giây để worker xử lý...\n');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  } catch (error) {
    console.error('❌ Lỗi:', error.response ? error.response.data : error.message);
  }
}

async function run() {
  // 1. Gửi code tiêu tốn khoảng ~64MB (Dưới giới hạn 256MB) -> Kỳ vọng ACCEPTED (hoặc hiển thị dung lượng bộ nhớ thực tế lớn)
  const pythonNormalMemory = `
import sys

# Đọc hai số từ input
a = int(input())
b = int(input())

# Khởi tạo bytearray ~64MB
large_arr = bytearray(64 * 1024 * 1024)

# Tính toán và in ra kết quả bình thường
print(max(a, b))
  `;

  // 2. Gửi code tiêu tốn khoảng ~300MB (Vượt giới hạn 256MB) -> Kỳ vọng MemoryLimitExceeded (MLE) hoặc thất bại
  const pythonHugeMemory = `
import sys

# Đọc hai số từ input
a = int(input())
b = int(input())

# Khởi tạo bytearray ~300MB (Vượt giới hạn 256MB)
large_arr = bytearray(300 * 1024 * 1024)

# Tính toán và in ra kết quả
print(max(a, b))
  `;

  await submitCode('Bộ nhớ lớn trong ngưỡng cho phép (~64MB)', pythonNormalMemory);
  await submitCode('Bộ nhớ cực đại vượt ngưỡng (~300MB)', pythonHugeMemory);
}

run();
