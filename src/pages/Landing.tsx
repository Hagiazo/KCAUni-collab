import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Users, BookOpen, MessageSquare, CheckCircle, Video, FileText } from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-gradient-header shadow-elegant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-accent rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="text-xl font-bold text-header-foreground">UniCollab</span>
            </div>
            <div className="flex space-x-4">
              <Button variant="ghost" className="text-header-foreground hover:bg-white/10">
                Features
              </Button>
              <Button variant="ghost" className="text-header-foreground hover:bg-white/10">
                About
              </Button>
              <Link to="/login">
                <Button variant="accent" size="sm">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-header/95 to-primary/80">
          <div className="absolute inset-0 bg-gradient-to-r from-header/90 to-header/70"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6 animate-slide-up">
                Collaborate.
                <span className="text-transparent bg-clip-text bg-gradient-accent block">
                  Create. Succeed.
                </span>
              </h1>
              <p className="text-xl text-white/90 mb-8 animate-slide-up">
                The ultimate collaboration platform for university group projects. 
                Work together seamlessly with real-time editing, chat, and task management.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in">
                <Link to="/register">
                  <Button variant="accent" size="lg" className="w-full sm:w-auto">
                    Get Started <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-white border-white/30 hover:bg-white/10">
                  Watch Demo
                </Button>
              </div>
            </div>
            
            <div className="relative animate-scale-in">
              <div className="w-full h-96 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl shadow-glow flex items-center justify-center border border-primary/20">
                <div className="text-center">
                  <Users className="w-24 h-24 text-primary mx-auto mb-4" />
                  <p className="text-white/80 text-lg">Students Collaborating</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Everything you need for group success
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful tools designed specifically for university collaboration
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: FileText,
                title: "Real-time Document Editing",
                description: "Collaborate on documents, code, and assignments in real-time with version control."
              },
              {
                icon: MessageSquare,
                title: "Instant Team Chat",
                description: "Stay connected with group chat, file sharing, and @mentions for important updates."
              },
              {
                icon: Video,
                title: "Video Conferencing",
                description: "Built-in video calls for face-to-face collaboration when you need it most."
              },
              {
                icon: CheckCircle,
                title: "Task Management",
                description: "Organize work with Kanban boards, assign tasks, and track progress together."
              },
              {
                icon: Users,
                title: "Group Management",
                description: "Easily create and manage groups for each course and assignment."
              },
              {
                icon: BookOpen,
                title: "Course Integration",
                description: "Seamlessly connect with your university courses and submit assignments."
              }
            ].map((feature, index) => (
              <Card key={index} className="bg-card/80 backdrop-blur-sm border-primary/10 hover:shadow-card transition-all duration-300 hover:scale-105">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Ready to transform your group work?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of students already collaborating more effectively with UniCollab.
          </p>
          <Link to="/register">
            <Button variant="accent" size="lg" className="animate-bounce-subtle">
              Start Collaborating Today <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-header text-header-foreground py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-accent rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-accent-foreground" />
                </div>
                <span className="text-xl font-bold">UniCollab</span>
              </div>
              <p className="text-white/80">
                Empowering students to collaborate and succeed together.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <div className="space-y-2 text-white/80">
                <p>Features</p>
                <p>Pricing</p>
                <p>Security</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <div className="space-y-2 text-white/80">
                <p>Help Center</p>
                <p>Contact Us</p>
                <p>Status</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <div className="space-y-2 text-white/80">
                <p>Privacy Policy</p>
                <p>Terms of Service</p>
                <p>GDPR</p>
              </div>
            </div>
          </div>
          <div className="border-t border-white/20 mt-8 pt-8 text-center text-white/60">
            <p>&copy; 2024 UniCollab. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;