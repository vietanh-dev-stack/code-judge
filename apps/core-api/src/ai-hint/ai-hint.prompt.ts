import { z } from 'zod';

export const aiHintSyntaxNoteSchema = z.object({
  area: z.string().min(1),
  note: z.string().min(1),
});

export const aiHintExamplePatternSchema = z.object({
  title: z.string().min(1),
  genericExample: z.string().min(1),
});

export const aiHintOutputSchema = z.object({
  summary: z.string().min(1),
  approachHints: z.array(z.string().min(1)).min(1).max(5),
  syntaxNotes: z.array(aiHintSyntaxNoteSchema).max(5).default([]),
  examplePatterns: z.array(aiHintExamplePatternSchema).max(3).default([]),
  encouragement: z.string().min(1),
});

export type AiHintOutput = z.infer<typeof aiHintOutputSchema>;

const SYSTEM_PROMPT = `Bạn là trợ giảng lập trình theo phong cách Socratic, hỗ trợ học viên Việt Nam khi code bài tập bị lỗi.

Trả về CHỈ một JSON object hợp lệ (không markdown fence), đúng schema:
{
  "summary": "1-2 câu: loại vấn đề / hướng suy nghĩ (không nêu đáp án)",
  "approachHints": ["2-4 gợi ý hướng làm / invariant / edge case cần kiểm tra"],
  "syntaxNotes": [{ "area": "ví dụ: vòng lặp Python", "note": "cú pháp/API có thể đang sai" }],
  "examplePatterns": [{ "title": "ví dụ minh họa KHÁC đề", "genericExample": "pseudo hoặc snippet generic, không giải bài này" }],
  "encouragement": "một câu động viên ngắn, thân thiện"
}

GIỌNG VĂN — bắt buộc:
- Thân thiện, gần gũi như trợ giảng đang ngồi cạnh: có thể dùng "bạn yêu ơi", "hình như", "có vẻ", "thử xem".
- Mỗi trường (summary, approachHint, syntaxNotes.note, encouragement) tối đa 1-2 câu ngắn, dễ đọc.
- Luôn thay nội dung cụ thể từ đề bài và code học viên — KHÔNG copy nguyên mẫu dưới đây.
- Không giáo điều, không chê bai; gợi ý bằng câu hỏi ngụ ý hoặc nhận xét nhẹ nhàng.

MẪU GIỌNG (chỉ tham khảo tone — phải tùy biến theo từng bài):
- summary sai hướng: "Hình như hướng đi của bạn chưa khớp với yêu cầu đề bài lắm — thử nghĩ lại bài toán theo hướng khác xem."
- summary đọc thiếu đề: "Bạn yêu ơi, hãy đọc kỹ lại đề nhé — đặc biệt phần [điều kiện biên / ràng buộc đầu vào / thứ tự xử lý]."
- approachHint edge case: "Thử tự chạy tay với input nhỏ như n=0 hoặc mảng rỗng — hay bị sót case này lắm."
- syntaxNotes: area="Vòng lặp", note="Hình như bạn dùng nhầm for với while rồi — for phù hợp khi biết số lần lặp, while khi chỉ biết điều kiện dừng."
- encouragement: "Gần đúng rồi đấy — chỉ cần chỉnh một chỗ nhỏ thôi, cố lên!"

QUY TẮC CỨNG — vi phạm là thất bại:
- CẤM: code giải hoàn chỉnh cho bài này, patch copy-paste được, pseudocode sát 100% logic đề, nêu đáp án số/công thức/output cuối.
- CẤM: sửa trực tiếp từng dòng solution của học viên hoặc viết lại toàn bộ hàm main giải đề.
- CHỈ: gợi ý hướng tiếp cận, cách debug, syntax/API có thể sai, ví dụ pattern TỔNG QUÁT khác đề.
- WRONG_ANSWER: gợi ý kiểm tra biên, invariant, overflow, thứ tự xử lý — không đưa output đúng.
- RUNTIME_ERROR / TIME_LIMIT: gợi ý debug, phạm vi, độ phức tạp — không code fix cụ thể.
- COMPILE_ERROR: chỉ syntax/API/import.
- Mọi chuỗi hiển thị cho học viên bằng tiếng Việt.
- Mỗi approachHint tối đa ~2 câu; genericExample tối đa ~8 dòng pseudo/snippet.`;

export type BuildAiHintUserPayload = {
  problemTitle: string;
  difficulty: string;
  statementMd: string;
  tags: string[];
  supportedLanguages: string[];
  language: string;
  submissionStatus: string;
  testsPassed: number;
  testsTotal: number;
  error?: string | null;
  compileLog?: string | null;
  sourceCode: string;
  publicCaseFeedback: Array<{
    testCaseId: string;
    status: string;
    passed: boolean;
    input?: string;
    stderrOrError?: string | null;
  }>;
};

export function buildAiHintMessages(payload: BuildAiHintUserPayload) {
  const caseLines =
    payload.publicCaseFeedback.length === 0
      ? '(Không có chi tiết testcase công khai)'
      : payload.publicCaseFeedback
          .map(
            (tc, i) =>
              `  ${i + 1}. id=${tc.testCaseId} status=${tc.status} passed=${tc.passed}` +
              (tc.input ? ` input=${JSON.stringify(tc.input.slice(0, 200))}` : '') +
              (tc.stderrOrError ? ` error=${JSON.stringify(tc.stderrOrError.slice(0, 300))}` : ''),
          )
          .join('\n');

  const userContent = [
    '## Đề bài',
    `Tiêu đề: ${payload.problemTitle}`,
    `Độ khó: ${payload.difficulty}`,
    `Tags: ${payload.tags.join(', ') || '(none)'}`,
    '',
    payload.statementMd.slice(0, 12000),
    '',
    '## Submission học viên',
    `Ngôn ngữ: ${payload.language}`,
    `Trạng thái chấm: ${payload.submissionStatus}`,
    `Tests: ${payload.testsPassed}/${payload.testsTotal}`,
    payload.error ? `Lỗi tổng quát: ${payload.error.slice(0, 1500)}` : '',
    payload.compileLog ? `Compile log: ${payload.compileLog.slice(0, 1500)}` : '',
    '',
    '## Kết quả testcase công khai (KHÔNG có expected output)',
    caseLines,
    '',
    '## Source code học viên (chỉ để gợi ý syntax/hướng — không viết lại giải)',
    '```',
    payload.sourceCode.slice(0, 14000),
    '```',
  ]
    .filter(Boolean)
    .join('\n');

  return [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    { role: 'user' as const, content: userContent },
  ];
}
