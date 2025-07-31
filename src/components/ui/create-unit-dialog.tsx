import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db, type Course } from "@/lib/database";
import { Upload } from "lucide-react";

interface CreateUnitDialogProps {
  lecturerId: string;
  onUnitCreated: () => void;
}

export const CreateUnitDialog = ({ lecturerId, onUnitCreated }: CreateUnitDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    courseId: "",
    semester: "",
    year: new Date().getFullYear().toString()
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadCourses = async () => {
      const availableCourses = await db.getCourses();
      setCourses(availableCourses);
    };
    loadCourses();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateUnit = async () => {
    if (!formData.code.trim() || !formData.name.trim() || !formData.courseId.trim()) {
      toast({
        title: "Required fields missing",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await db.createUnit({
        code: formData.code.toUpperCase(),
        name: formData.name,
        description: formData.description || `${formData.name} course unit`,
        lecturerId,
        courseId: formData.courseId,
        semester: formData.semester || "JAN-APRIL",
        year: parseInt(formData.year),
        credits: 3
      });

      toast({
        title: "Unit created successfully!",
        description: `${formData.code} - ${formData.name} has been created.`
      });

      // Reset form
      setFormData({
        code: "",
        name: "",
        description: "",
        courseId: "",
        semester: "",
        year: new Date().getFullYear().toString()
      });
      setIsOpen(false);
      onUnitCreated();
    } catch (error) {
      toast({
        title: "Error creating unit",
        description: "Failed to create unit. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="accent" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Create Unit
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card/95 backdrop-blur-sm border-primary/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create New Unit</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Add a new unit to your teaching portfolio.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="unitCode" className="text-foreground">Unit Code *</Label>
            <Input
              id="unitCode"
              placeholder="e.g., CS301"
              value={formData.code}
              onChange={(e) => handleInputChange("code", e.target.value)}
              className="bg-card/50 border-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <Label htmlFor="unitName" className="text-foreground">Unit Name *</Label>
            <Input
              id="unitName"
              placeholder="e.g., Database Systems"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="bg-card/50 border-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <Label htmlFor="course" className="text-foreground">Course *</Label>
            <Select value={formData.courseId} onValueChange={(value) => handleInputChange("courseId", value)}>
              <SelectTrigger className="bg-card/50 border-primary/20 focus:border-primary">
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="semester" className="text-foreground">Semester</Label>
            <Select value={formData.semester} onValueChange={(value) => handleInputChange("semester", value)}>
              <SelectTrigger className="bg-card/50 border-primary/20 focus:border-primary">
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="JAN-APRIL">JAN - APRIL</SelectItem>
                <SelectItem value="MAY-AUG">MAY - AUG</SelectItem>
                <SelectItem value="SEPT-DEC">SEPT - DEC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="year" className="text-foreground">Academic Year</Label>
            <Select value={formData.year} onValueChange={(value) => handleInputChange("year", value)}>
              <SelectTrigger className="bg-card/50 border-primary/20 focus:border-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
                <SelectItem value="2028">2028</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description" className="text-foreground">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the unit"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              className="bg-card/50 border-primary/20 focus:border-primary"
              rows={3}
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleCreateUnit} 
              variant="hero"
              disabled={isLoading || !formData.code.trim() || !formData.name.trim() || !formData.courseId.trim()}
            >
              {isLoading ? "Creating..." : "Create Unit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};