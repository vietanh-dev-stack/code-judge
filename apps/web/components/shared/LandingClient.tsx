'use client';

import { ArrowRight, BarChart3, Code2, Shield, Sparkles, Users, Zap } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/button';

export default function LandingClient() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative py-20 sm:py-32 lg:py-40 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/30 to-transparent"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-8">
            <div className="inline-block">
              <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                The Future of Programming Education
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-tight max-w-4xl mx-auto">
              Master Competitive Programming with AI
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Create intelligent contests, practice with auto-generated test cases, and compete with
              programmers worldwide. All in one powerful platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" asChild className="text-base">
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
      <section id="features" className="py-20 sm:py-32 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Powerful Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to teach, learn, and compete in programming
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 border border-border rounded-lg hover:border-primary transition hover:shadow-lg">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-3">AI-Powered Problem Creation</h3>
              <p className="text-muted-foreground">
                Upload problem statements and let AI generate comprehensive test cases
                automatically. Save hours on problem preparation.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 border border-border rounded-lg hover:border-primary transition hover:shadow-lg">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-3">Instant Auto-Judging</h3>
              <p className="text-muted-foreground">
                Secure sandboxed execution with configurable resource limits. Get results in
                seconds, not hours.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 border border-border rounded-lg hover:border-primary transition hover:shadow-lg">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-3">Classroom Management</h3>
              <p className="text-muted-foreground">
                Create classes, invite students with one-click links, and manage assignments
                seamlessly.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-8 border border-border rounded-lg hover:border-primary transition hover:shadow-lg">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                <Code2 className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-3">Multi-Language Support</h3>
              <p className="text-muted-foreground">
                Support for C++, Java, Python, JavaScript and more. With syntax highlighting and
                advanced editor features.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-8 border border-border rounded-lg hover:border-primary transition hover:shadow-lg">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-3">Detailed Analytics</h3>
              <p className="text-muted-foreground">
                Track student progress, analyze problem difficulty, and export comprehensive
                reports.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-8 border border-border rounded-lg hover:border-primary transition hover:shadow-lg">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-3">Plagiarism Detection</h3>
              <p className="text-muted-foreground">
                AST-based code similarity detection to maintain academic integrity in your contests.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Educators Section */}
      <section id="for-educators" className="py-20 sm:py-32 border-t border-border bg-secondary/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl sm:text-5xl font-bold">Built for Educators</h2>
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
            <div className="hidden md:flex items-center justify-center">
              <div className="bg-primary rounded-lg p-1 shadow-2xl">
                <div className="bg-background rounded p-8 w-full">
                  <div className="space-y-4">
                    <div className="h-3 bg-muted w-2/3 rounded"></div>
                    <div className="h-3 bg-muted w-1/2 rounded"></div>
                    <div className="space-y-2 mt-6">
                      <div className="flex gap-2">
                        <div className="h-2 bg-muted w-1/4 rounded"></div>
                        <div className="h-2 bg-muted w-1/3 rounded"></div>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-2 bg-muted w-1/3 rounded"></div>
                        <div className="h-2 bg-muted w-1/4 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Students Section */}
      <section id="for-students" className="py-20 sm:py-32 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="hidden md:flex items-center justify-center order-2">
              <div className="bg-secondary rounded-lg p-1 shadow-2xl">
                <div className="bg-background rounded p-8 w-full">
                  <div className="space-y-4">
                    <div className="h-3 bg-muted w-2/3 rounded"></div>
                    <div className="h-3 bg-muted w-1/2 rounded"></div>
                    <div className="space-y-2 mt-6">
                      <div className="flex gap-2">
                        <div className="h-2 bg-muted w-1/4 rounded"></div>
                        <div className="h-2 bg-muted w-1/3 rounded"></div>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-2 bg-muted w-1/3 rounded"></div>
                        <div className="h-2 bg-muted w-1/4 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6 order-1">
              <h2 className="text-4xl sm:text-5xl font-bold">Perfect for Students</h2>
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
            <Button size="lg" variant="secondary" asChild>
              <Link href="/register">Get Started Free</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-primary-foreground text-foreground hover:bg-primary-foreground hover:text-primary"
            >
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
