const axios = require('axios');

async function stressTest() {
  const TOTAL_SUBMISSIONS = 1000;
  const CONCURRENCY = 50; // Gửi 50 bài mỗi đợt để tránh lỗi mạng
  const submissionData = {
    problemId: "3b7ffcfd-2d7f-4a6f-92ec-524bc0e3ef13",
    language: "PYTHON",
    mode: "ALGO",
    sourceCode: "a, b = map(int, input().split())\nprint(a + b)",
    userId: "4b17f4d4-1ffa-490a-8e67-7c331d9b9a5d"
  };

  console.log(`🔥 BẮT ĐẦU STRESS TEST: ${TOTAL_SUBMISSIONS} bài nộp...`);
  const startTime = Date.now();

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < TOTAL_SUBMISSIONS; i += CONCURRENCY) {
    const chunk = Array.from({ length: Math.min(CONCURRENCY, TOTAL_SUBMISSIONS - i) }, (_, index) => {
      const currentId = i + index + 1;
      return axios.post('http://localhost:3000/submissions', submissionData)
        .then(() => {
          successCount++;
          if (successCount % 100 === 0) console.log(`✅ Đã gửi thành công ${successCount}/${TOTAL_SUBMISSIONS} bài...`);
        })
        .catch((err) => {
          errorCount++;
          // console.error(`❌ Lỗi bài ${currentId}:`, err.message);
        });
    });

    await Promise.all(chunk);
  }

  const duration = (Date.now() - startTime) / 1000;
  console.log('\n--- KẾT QUẢ GỬI BÀI ---');
  console.log(`⏱️ Tổng thời gian gửi: ${duration.toFixed(2)} giây`);
  console.log(`✅ Thành công: ${successCount}`);
  console.log(`❌ Thất bại: ${errorCount}`);
  console.log('-----------------------');
  console.log('\nℹ️ Các bài nộp hiện đang nằm trong hàng đợi BullMQ.');
  console.log('Worker sẽ xử lý chúng dần dần. Bạn có thể theo dõi log của worker.');
}

stressTest();
