const axios = require('axios');

async function simulateRuntimeError() {
  const submissionData = {
    problemId: "95262940-28c9-4233-93d5-37a28fa4aac8", // ID bài toán tổng 2 số
    language: "CPP",
    mode: "ALGO",
    // Code gây lỗi Runtime Error: Chia cho 0
    sourceCode: `#include <iostream>
using namespace std;
int main() {
    int a, b;
    cin >> a >> b;
    int x = 10 / 0; // Chia cho 0
    cout << x << endl;
    return 0;
}`,
    userId: "e953dfb60654c58fc82dc9a5"
  };

  try {
    console.log('🚀 Đang mô phỏng gửi code lỗi Runtime Error (Chia cho 0)...');
    const response = await axios.post('http://localhost:3000/submissions', submissionData);
    console.log('✅ Thành công! Phản hồi từ API:', JSON.stringify(response.data, null, 2));
    console.log('\nĐợi 15 giây để worker xử lý...');
  } catch (error) {
    console.error('❌ Lỗi:', error.response ? error.response.data : error.message);
  }
}

simulateRuntimeError();
