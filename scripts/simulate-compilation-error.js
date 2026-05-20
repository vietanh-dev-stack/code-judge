const axios = require('axios');

async function simulateCompilationError() {
  const submissionData = {
    problemId: "95262940-28c9-4233-93d5-37a28fa4aac8", // ID bài toán tổng 2 số
    language: "CPP",
    mode: "ALGO",
    // Code gây lỗi Compilation Error: viết sai câu lệnh
    sourceCode: `#include13213 <iostream>
usingr32r32 namespacezzz std;csfw
int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b << endl;
    return 0;
}`,
    userId: "e953dfb60654c58fc82dc9a5"
  };

  try {
    console.log('🚀 Đang mô phỏng gửi code lỗi Compilation Error (Viết bừa)...');
    const response = await axios.post('http://localhost:3000/submissions', submissionData);
    console.log('✅ Thành công! Phản hồi từ API:', JSON.stringify(response.data, null, 2));
    console.log('\nĐợi 15 giây để worker xử lý...');
  } catch (error) {
    console.error('❌ Lỗi:', error.response ? error.response.data : error.message);
  }
}

simulateCompilationError();
