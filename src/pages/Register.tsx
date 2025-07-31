import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Mail, Lock, User, ArrowLeft, GraduationCap, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/database";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
    course: "",
    semester: "",
    year: new Date().getFullYear().toString()
  });
  const [isLoading, setIsLoading] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Load courses on component mount
  useEffect(() => {
    const loadCourses = async () => {
      const availableCourses = await db.getCourses();
      setCourses(availableCourses);
    };
    loadCourses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Please make sure your passwords match.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    if (formData.role === 'student' && (!formData.course || !formData.semester)) {
      toast({
        title: "Required Fields Missing",
        description: "Please select your course and semester.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    try {
      const result = await db.createUser({
        name: formData.name,
        email: formData.email,
        password: formData.password, // In production, hash this
        role: formData.role as 'student' | 'lecturer',
        course: formData.role === 'student' ? formData.course : undefined,
        semester: formData.role === 'student' ? formData.semester : undefined,
        year: formData.role === 'student' ? parseInt(formData.year) : undefined
      });

      if (result.success && result.user) {
        // Store user data in localStorage
        localStorage.setItem("userRole", result.user.role);
        localStorage.setItem("userName", result.user.name);
        localStorage.setItem("userId", result.user.id);
        localStorage.setItem("userEmail", result.user.email);
        
        // Only store course, semester, and year for students
        if (result.user.role === 'student') {
          if (result.user.course) {
            localStorage.setItem("userCourse", result.user.course);
          }
          if (result.user.semester) {
            localStorage.setItem("userSemester", result.user.semester);
          }
          if (result.user.year) {
            localStorage.setItem("userYear", result.user.year.toString());
          }
        }
        if (result.user.yearOfAdmission) {
          localStorage.setItem("userYearOfAdmission", result.user.yearOfAdmission.toString());
        }
        
        toast({
          title: "Account Created!",
          description: "Welcome to KCAU UniCollab. You've been successfully registered.",
        });
        
        navigate("/dashboard");
      } else {
        toast({
          title: "Registration Failed",
          description: result.error || "Registration failed. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getEmailPlaceholder = () => {
    if (formData.role === 'student') {
      return "e.g., 2507564@students.kcau.ac.ke";
    } else {
      return "e.g., 0001@lecturer.kcau.ac.ke";
    }
  };

  const getEmailHelper = () => {
    if (formData.role === 'student') {
      return "Format: YYNNNNN@students.kcau.ac.ke (YY = admission year, NNNNN = student number)";
    } else {
      return "Format: NNNN@lecturer.kcau.ac.ke (NNNN = 4-digit staff number)";
    }
  };

  const semesters = [
    { value: "JAN-APRIL", label: "JAN - APRIL" },
    { value: "MAY-AUG", label: "MAY - AUG" },
    { value: "SEPT-DEC", label: "SEPT - DEC" }
  ];

  return (
    <div className="min-h-screen bg-gradient-card flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <Card className="bg-card/90 backdrop-blur-sm border-primary/10 shadow-elegant">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">Join KCAU UniCollab</CardTitle>
            <CardDescription className="text-muted-foreground">
              Create your account and start collaborating
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Full Name</Label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="pl-10 bg-card/50 border-primary/20 focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-foreground">I am a...</Label>
                <RadioGroup 
                  value={formData.role} 
                  onValueChange={(value) => handleInputChange("role", value)}
                >
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-primary/10 hover:bg-primary/5 transition-colors">
                    <RadioGroupItem value="student" id="student" />
                    <Label htmlFor="student" className="flex items-center space-x-2 cursor-pointer flex-1">
                      <GraduationCap className="w-4 h-4 text-primary" />
                      <span>Student</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-primary/10 hover:bg-primary/5 transition-colors">
                    <RadioGroupItem value="lecturer" id="lecturer" />
                    <Label htmlFor="lecturer" className="flex items-center space-x-2 cursor-pointer flex-1">
                      <Users className="w-4 h-4 text-primary" />
                      <span>Lecturer</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.role === 'student' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="course" className="text-foreground">Course of Study</Label>
                    <Select value={formData.course} onValueChange={(value) => handleInputChange("course", value)}>
                      <SelectTrigger className="bg-card/50 border-primary/20 focus:border-primary">
                        <SelectValue placeholder="Select your course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.name} ({course.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="semester" className="text-foreground">Current Semester</Label>
                    <Select value={formData.semester} onValueChange={(value) => handleInputChange("semester", value)}>
                      <SelectTrigger className="bg-card/50 border-primary/20 focus:border-primary">
                        <SelectValue placeholder="Select your semester" />
                      </SelectTrigger>
                      <SelectContent>
                        {semesters.map((semester) => (
                          <SelectItem key={semester.value} value={semester.value}>
                            {semester.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="year" className="text-foreground">Academic Year</Label>
                    <Select value={formData.year} onValueChange={(value) => handleInputChange("year", value)}>
                      <SelectTrigger className="bg-card/50 border-primary/20 focus:border-primary">
                        <SelectValue placeholder="Select your academic year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2026">2026</SelectItem>
                        <SelectItem value="2027">2027</SelectItem>
                        <SelectItem value="2028">2028</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select the year you are currently studying in
                    </p>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">KCAU Email</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={getEmailPlaceholder()}
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="pl-10 bg-card/50 border-primary/20 focus:border-primary"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">{getEmailHelper()}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="pl-10 bg-card/50 border-primary/20 focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    className="pl-10 bg-card/50 border-primary/20 focus:border-primary"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                variant="hero"
                disabled={isLoading}
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:text-primary-glow transition-colors font-medium">
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;