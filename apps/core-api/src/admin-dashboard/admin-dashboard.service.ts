import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics() {
    // 1. Top Statistics
    const [totalUsers, totalProblems, totalContests, activeClassrooms] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.problem.count(),
      this.prisma.contest.count(),
      this.prisma.classRoom.count({ where: { isActive: true } }),
    ]);

    // 2. Submission Activity Chart (Last 90 Days daily counts - single query optimized)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    ninetyDaysAgo.setHours(0, 0, 0, 0);

    const submissions = await this.prisma.submission.findMany({
      where: {
        createdAt: { gte: ninetyDaysAgo },
      },
      select: {
        status: true,
        createdAt: true,
      },
    });

    const submissionsByDay: Record<string, { total: number; accepted: number }> = {};
    for (const sub of submissions) {
      // Offset time to local date string to match timezone
      const localDate = new Date(sub.createdAt.getTime() - sub.createdAt.getTimezoneOffset() * 60000);
      const dateKey = localDate.toISOString().slice(0, 10);
      if (!submissionsByDay[dateKey]) {
        submissionsByDay[dateKey] = { total: 0, accepted: 0 };
      }
      submissionsByDay[dateKey].total++;
      if (sub.status === 'Accepted') {
        submissionsByDay[dateKey].accepted++;
      }
    }

    const dailyActivity = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
      const dateKey = localDate.toISOString().slice(0, 10);
      
      const counts = submissionsByDay[dateKey] || { total: 0, accepted: 0 };
      const failed = counts.total - counts.accepted;
      const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      dailyActivity.push({ 
        day: dayLabel, 
        total: counts.total, 
        accepted: counts.accepted, 
        failed 
      });
    }

    // 3. Verdict Distribution (Accepted, WA, RE, TLE, CE counts & percentages)
    const [acceptedVal, wrongVal, runtimeVal, tleVal, compileVal] = await Promise.all([
      this.prisma.submission.count({ where: { status: 'Accepted' } }),
      this.prisma.submission.count({ where: { status: 'Wrong' } }),
      this.prisma.submission.count({ where: { status: 'RuntimeError' } }),
      this.prisma.submission.count({ where: { status: 'TimeLimitExceeded' } }),
      this.prisma.submission.count({ where: { status: 'CompilationError' } }),
    ]);

    const totalVerdicts = acceptedVal + wrongVal + runtimeVal + tleVal + compileVal;
    const getVerdictPercentage = (val: number) =>
      totalVerdicts > 0 ? `${((val / totalVerdicts) * 100).toFixed(1)}%` : '0%';

    const verdictDistribution = [
      { name: 'Accepted', value: acceptedVal, color: '#10b981', percentage: getVerdictPercentage(acceptedVal) },
      { name: 'Wrong Answer', value: wrongVal, color: '#f43f5e', percentage: getVerdictPercentage(wrongVal) },
      { name: 'Runtime Error', value: runtimeVal, color: '#ec4899', percentage: getVerdictPercentage(runtimeVal) },
      { name: 'Time Limit Exceeded', value: tleVal, color: '#f59e0b', percentage: getVerdictPercentage(tleVal) },
      { name: 'Compilation Error', value: compileVal, color: '#64748b', percentage: getVerdictPercentage(compileVal) },
    ];

    // 4. Language Distribution
    const submissionsGrouped = await this.prisma.submission.groupBy({
      by: ['language'],
      _count: { id: true },
    });

    const langCounts: Record<string, number> = {
      Python: 0,
      'C++': 0,
      Java: 0,
      JavaScript: 0,
      Go: 0,
      Rust: 0,
    };

    for (const group of submissionsGrouped) {
      if (!group.language) continue;
      const lang = group.language.toLowerCase();
      if (lang.includes('python')) {
        langCounts['Python'] += group._count.id;
      } else if (lang.includes('cpp') || lang.includes('c++')) {
        langCounts['C++'] += group._count.id;
      } else if (lang.includes('java') && !lang.includes('javascript')) {
        langCounts['Java'] += group._count.id;
      } else if (lang.includes('javascript') || lang.includes('node') || lang.includes('js')) {
        langCounts['JavaScript'] += group._count.id;
      } else if (lang.includes('go')) {
        langCounts['Go'] += group._count.id;
      } else if (lang.includes('rust') || lang === 'rs') {
        langCounts['Rust'] += group._count.id;
      }
    }

    const totalLang = Object.values(langCounts).reduce((sum, v) => sum + v, 0);
    const getLangPercentage = (val: number) =>
      totalLang > 0 ? `${((val / totalLang) * 100).toFixed(1)}%` : '0%';

    const languageColors: Record<string, string> = {
      Python: '#eab308',
      'C++': '#3b82f6',
      Java: '#f97316',
      JavaScript: '#facc15',
      Go: '#06b6d4',
      Rust: '#ea580c',
    };

    const languageDistribution = Object.entries(langCounts)
      .map(([name, value]) => ({
        name,
        value,
        color: languageColors[name],
        percentage: getLangPercentage(value),
      }))
      .sort((a, b) => b.value - a.value);

    // 5. Top Problems: Most Attempted Problems
    const mostAttemptedGroup = await this.prisma.submission.groupBy({
      by: ['problemId'],
      _count: { id: true },
      orderBy: {
        _count: { id: 'desc' },
      },
      take: 5,
    });

    const mostAttemptedProblems = [];
    for (const group of mostAttemptedGroup) {
      const problem = await this.prisma.problem.findUnique({
        where: { id: group.problemId },
      });
      if (!problem) continue;

      const accepted = await this.prisma.submission.count({
        where: { problemId: problem.id, status: 'Accepted' },
      });

      mostAttemptedProblems.push({
        id: problem.id,
        title: problem.title,
        difficulty: problem.difficulty.charAt(0) + problem.difficulty.slice(1).toLowerCase(),
        attempts: group._count.id,
        accepted,
        acRate: group._count.id > 0 ? parseFloat(((accepted / group._count.id) * 100).toFixed(1)) : 0,
      });
    }

    // Hardest Problems (Lowest AC rate with active submissions)
    const allProblemsGrouped = await this.prisma.submission.groupBy({
      by: ['problemId'],
      _count: { id: true },
    });

    const hardestCandidates = [];
    for (const group of allProblemsGrouped) {
      const problem = await this.prisma.problem.findUnique({
        where: { id: group.problemId },
      });
      if (!problem) continue;

      const accepted = await this.prisma.submission.count({
        where: { problemId: problem.id, status: 'Accepted' },
      });

      const acRate = group._count.id > 0 ? parseFloat(((accepted / group._count.id) * 100).toFixed(1)) : 0;
      hardestCandidates.push({
        id: problem.id,
        title: problem.title,
        difficulty: problem.difficulty.charAt(0) + problem.difficulty.slice(1).toLowerCase(),
        attempts: group._count.id,
        accepted,
        acRate,
      });
    }

    const hardestProblems = hardestCandidates
      .sort((a, b) => a.acRate - b.acRate)
      .slice(0, 5);

    return {
      stats: {
        totalUsers,
        totalProblems,
        totalContests,
        activeClassrooms,
      },
      dailyActivity,
      verdictDistribution,
      languageDistribution,
      topProblems: {
        mostAttempted: mostAttemptedProblems,
        hardest: hardestProblems,
      },
    };
  }
}
