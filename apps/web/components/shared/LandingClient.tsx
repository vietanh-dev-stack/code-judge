'use client';

import { ArrowRight, BarChart3, Code2, Shield, Sparkles, Users, Zap } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/button';

export default function LandingClient() {
  const features = [
    {
      icon: Sparkles,
      title: 'AI-Powered Problem Creation',
      description:
        'Upload problem statements and let AI generate comprehensive test cases automatically. Save hours on problem preparation.',
    },
    {
      icon: Zap,
      title: 'Instant Auto-Judging',
      description:
        'Secure sandboxed execution with configurable resource limits. Get results in seconds, not hours.',
    },
    {
      icon: Users,
      title: 'Classroom Management',
      description:
        'Create classes, invite students with one-click links, and manage assignments seamlessly.',
    },
    {
      icon: Code2,
      title: 'Multi-Language Support',
      description:
        'Support for C++, Java, Python, JavaScript and more. With syntax highlighting and advanced editor features.',
    },
    {
      icon: BarChart3,
      title: 'Detailed Analytics',
      description:
        'Track student progress, analyze problem difficulty, and export comprehensive reports.',
    },
    {
      icon: Shield,
      title: 'Plagiarism Detection',
      description:
        'AST-based code similarity detection to maintain academic integrity in your contests.',
    },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="relative py-20 sm:py-32 lg:py-40 overflow-hidden">
        <div className="absolute inset-0 bg-muted/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-8">
            <div className="inline-block">
              <span className="text-sm font-semibold uppercase tracking-wider border border-primary rounded-full text-primary p-1">
                The Future of Programming Education
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-tight max-w-4xl mx-auto">
              Master Competitive <span className="text-primary">Programming with AI</span>
            </h1>

            <p className="text-lg sm:text-md max-w-2xl mx-auto leading-relaxed text-muted-foreground">
              Create intelligent contests, practice with auto-generated test cases, and compete with
              programmers worldwide. All in one powerful platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" asChild className="text-base hover:scale-105 transition-transform">
                <Link href="/register">
                  Get Started Free <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base">
                <Link href="#demo">Watch Demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Powerful Features</h2>
            <p className="text-lg text-primary/80 max-w-2xl mx-auto">
              Everything you need to teach, learn, and compete in programming
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <div
                  key={index}
                  className="p-8 border border-border rounded-lg hover:border-primary transition hover:shadow-lg"
                >
                  <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary-foreground" />
                  </div>

                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>

                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* For Educators Section */}
      <section id="for-educators" className="py-20 sm:py-32  bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl sm:text-5xl font-bold">
                Built for <span className="text-primary">Educators</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Focus on teaching, not grading. CodeJudge handles the rest.
              </p>

              <ul className="space-y-4">
                <li className="flex gap-3">
                  <Zap className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <strong>Quick Contest Setup</strong>
                    <p className="text-muted-foreground">
                      Create exams in minutes with password protection and access control
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <BarChart3 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <strong>Real-time Dashboards</strong>
                    <p className="text-muted-foreground">
                      Monitor submissions live and see detailed statistics per problem
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Users className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <strong>Organization Management</strong>
                    <p className="text-muted-foreground">
                      Manage multiple instructors and problem repositories at scale
                    </p>
                  </div>
                </li>
              </ul>

              <Button size="lg" asChild>
                <Link href="/register?role=instructor">
                  Create Free Account <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
            <div className="relative hidden md:block overflow-hidden rounded-[32px] bg-muted/1 p-2 shadow-2xl order-1">
              <div className="relative">
                <div className="rounded-3xl border border-slate-800 bg-[#0B1120] shadow-2xl overflow-hidden">
                  {/* Top Bar */}
                  <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800 bg-[#0F172A]">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />

                    <span className="ml-4 text-sm text-slate-400">leaderboard.ts</span>
                  </div>

                  {/* Code */}
                  <div className="p-6 font-mono text-sm leading-7">
                    <div>
                      <span className="text-purple-400">async</span>{' '}
                      <span className="text-purple-400">function</span>{' '}
                      <span className="text-blue-400">fetchLeaderboard</span>
                      <span className="text-white">()</span>{' '}
                      <span className="text-white">{'{'}</span>
                    </div>

                    <div className="pl-6">
                      <span className="text-purple-400">try</span>{' '}
                      <span className="text-white">{'{'}</span>
                    </div>

                    <div className="pl-12">
                      <span className="text-purple-400">const</span>{' '}
                      <span className="text-blue-300">response</span>{' '}
                      <span className="text-white">=</span>{' '}
                      <span className="text-purple-400">await</span>{' '}
                      <span className="text-green-400">fetch</span>
                      <span className="text-white">(</span>
                      <span className="text-orange-400">'/api/rankings'</span>
                      <span className="text-white">)</span>
                    </div>

                    <div className="pl-12 mt-2">
                      <span className="text-purple-400">const</span>{' '}
                      <span className="text-blue-300">data</span>{' '}
                      <span className="text-white">=</span>{' '}
                      <span className="text-purple-400">await</span> response.json()
                    </div>

                    <div className="pl-12 mt-4">
                      <span className="text-purple-400">return</span> data.users
                      <span className="text-white">.</span>
                      <span className="text-green-400">sort</span>
                      <span className="text-white">((</span>a, b
                      <span className="text-white">)</span>{' '}
                      <span className="text-white">=&gt;</span> b.score - a.score)
                    </div>

                    <div className="pl-6 mt-4">
                      <span className="text-white">{'}'}</span>{' '}
                      <span className="text-purple-400">catch</span>{' '}
                      <span className="text-white">(error)</span>{' '}
                      <span className="text-white">{'{'}</span>
                    </div>

                    <div className="pl-12">
                      console
                      <span className="text-white">.</span>
                      <span className="text-red-400">error</span>
                      <span className="text-white">(</span>
                      <span className="text-orange-400">'Failed to load leaderboard'</span>, error
                      <span className="text-white">)</span>
                    </div>

                    <div className="pl-12 mt-2">
                      <span className="text-purple-400">return</span> []
                    </div>

                    <div className="pl-6">
                      <span className="text-white">{'}'}</span>
                    </div>

                    <div>
                      <span className="text-white">{'}'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Students Section */}
      <section id="for-students" className="py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative hidden md:block overflow-hidden rounded-[32px] bg-[#020b1d] p-2 shadow-2xl order-1">
              <div className="relative">
                <div className="rounded-3xl border border-slate-800 bg-[#0B1120] shadow-2xl overflow-hidden">
                  {/* Top Bar */}
                  <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800 bg-[#0F172A]">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />

                    <span className="ml-4 text-sm text-slate-400">solution.ts</span>
                  </div>

                  {/* Code */}
                  <div className="p-6 font-mono text-sm leading-7">
                    <div>
                      <span className="text-purple-400">const</span>{' '}
                      <span className="text-blue-400">twoSum</span>{' '}
                      <span className="text-white">=</span>{' '}
                      <span className="text-orange-400">(nums, target)</span>{' '}
                      <span className="text-white">=&gt;</span>{' '}
                      <span className="text-white">{'{'}</span>
                    </div>

                    <div className="pl-6">
                      <span className="text-purple-400">const</span>{' '}
                      <span className="text-blue-300">map</span>{' '}
                      <span className="text-white">=</span>{' '}
                      <span className="text-purple-400">new</span>{' '}
                      <span className="text-green-400">Map</span>()
                    </div>

                    <div className="pl-6 mt-4">
                      <span className="text-purple-400">for</span>{' '}
                      <span className="text-white">(</span>
                      <span className="text-purple-400">let</span> i = 0; i &lt; nums.length; i++
                      <span className="text-white">)</span>{' '}
                      <span className="text-white">{'{'}</span>
                    </div>

                    <div className="pl-12">
                      <span className="text-purple-400">const</span> diff = target - nums[i]
                    </div>

                    <div className="pl-12 mt-2">
                      <span className="text-purple-400">if</span> (map.has(diff)){' '}
                      <span className="text-purple-400">return</span> [map.get(diff), i]
                    </div>

                    <div className="pl-12 mt-2">map.set(nums[i], i)</div>

                    <div className="pl-6">{'}'}</div>

                    <div>{'}'}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6 order-2">
              <h2 className="text-4xl sm:text-5xl font-bold">
                Perfect for <span className="text-primary">Students</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Practice, compete, and master programming
              </p>

              <ul className="space-y-4">
                <li className="flex gap-3">
                  <Code2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <strong>Vast Problem Library</strong>
                    <p className="text-muted-foreground">
                      Access thousands of problems from easy to hard with detailed explanations
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Sparkles className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <strong>Instant Feedback</strong>
                    <p className="text-muted-foreground">
                      Get detailed test results to understand what went wrong immediately
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <BarChart3 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <strong>Track Your Progress</strong>
                    <p className="text-muted-foreground">
                      Monitor your improvement with detailed statistics and achievements
                    </p>
                  </div>
                </li>
              </ul>

              <Button size="lg" asChild>
                <Link href="/register?role=student">
                  Join the Community <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32 border-t border-border bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <h2 className="text-4xl sm:text-5xl font-bold">
            Ready to Transform Your Programming Education?
          </h2>
          <p className="text-lg opacity-90">
            Start building smarter contests and practice problems today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="outline"
              className="bg-[#0F172A] hover:bg-[#0F172A] hover:text-white hover:scale-105 transition-transform"
              asChild
            >
              <Link href="/register">Get Started Free</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="bg-primary-foreground text-primary hover:scale-105 hover:bg-white hover:text-primary transition-transform "
            >
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
