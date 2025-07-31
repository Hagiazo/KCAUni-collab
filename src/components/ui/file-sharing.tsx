import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Upload, 
  Download, 
  FileText, 
  Image, 
  File, 
  Trash2, 
  Eye, 
  Share2,
  Plus,
  Search,
  Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { wsManager, FileUpload } from '@/lib/websocket';
import { v4 as uuidv4 } from 'uuid';

interface SharedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
  description?: string;
  content?: string;
  url?: string;
  version: number;
  isShared: boolean;
}

interface FileSharingProps {
  groupId: string;
  userId: string;
  userName: string;
  initialFiles?: SharedFile[];
}

export const FileSharing = ({ groupId, userId, userName, initialFiles = [] }: FileSharingProps) => {
  const [files, setFiles] = useState<SharedFile[]>(initialFiles);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFileType, setSelectedFileType] = useState<string>('all');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [newFileDescription, setNewFileDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // File type icons
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.includes('text') || type.includes('document')) return FileText;
    return File;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (selectedFiles: FileList) => {
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileId = uuidv4();
      
      // Start upload progress
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

      try {
        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            const currentProgress = prev[fileId] || 0;
            if (currentProgress >= 100) {
              clearInterval(progressInterval);
              return prev;
            }
            return { ...prev, [fileId]: currentProgress + 10 };
          });
        }, 200);

        // Read file content for text files
        let content: string | undefined;
        if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.json')) {
          content = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsText(file);
          });
        }

        // Create file object
        const newFile: SharedFile = {
          id: fileId,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          uploadedBy: userName,
          uploadedAt: new Date(),
          description: newFileDescription,
          content,
          version: 1,
          isShared: true
        };

        // Add to local state
        setFiles(prev => [...prev, newFile]);

        // Send to other users via WebSocket
        const fileUpload: FileUpload = {
          fileId: newFile.id,
          fileName: newFile.name,
          fileType: newFile.type,
          fileSize: newFile.size,
          uploadedBy: userName,
          content: newFile.content
        };

        wsManager.sendFileUpload(fileUpload, groupId);

        // Complete upload
        setTimeout(() => {
          setUploadProgress(prev => {
            const { [fileId]: _, ...rest } = prev;
            return rest;
          });
        }, 500);

        toast({
          title: "File Uploaded",
          description: `${file.name} has been shared with the group.`,
        });

      } catch (error) {
        console.error('Upload failed:', error);
        setUploadProgress(prev => {
          const { [fileId]: _, ...rest } = prev;
          return rest;
        });
        toast({
          title: "Upload Failed",
          description: `Failed to upload ${file.name}. Please try again.`,
          variant: "destructive"
        });
      }
    }

    setNewFileDescription('');
    setIsUploadDialogOpen(false);
  }, [userName, newFileDescription, toast]);

  // Handle file download
  const handleDownload = (file: SharedFile) => {
    if (file.content) {
      // Text file - create blob and download
      const blob = new Blob([file.content], { type: file.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (file.url) {
      // Binary file - open URL
      window.open(file.url, '_blank');
    }

    toast({
      title: "File Downloaded",
      description: `${file.name} has been downloaded.`,
    });
  };

  // Handle file deletion
  const handleDelete = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    toast({
      title: "File Deleted",
      description: "File has been removed from the workspace.",
    });
  };

  // Filter files
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.uploadedBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedFileType === 'all' || 
                       (selectedFileType === 'images' && file.type.startsWith('image/')) ||
                       (selectedFileType === 'documents' && (file.type.includes('text') || file.type.includes('document'))) ||
                       (selectedFileType === 'code' && (file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.jsx') || file.name.endsWith('.tsx')));
    
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header with Upload Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold text-foreground">Shared Files</h3>
          <p className="text-sm text-muted-foreground">
            {files.length} files • {files.reduce((sum, f) => sum + f.size, 0)} total size
          </p>
        </div>
        
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="accent">
              <Plus className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card/95 backdrop-blur-sm border-primary/10">
            <DialogHeader>
              <DialogTitle>Upload Files</DialogTitle>
              <DialogDescription>
                Share files with your group members. Text files will be editable by all members.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="file-description">Description (Optional)</Label>
                <Textarea
                  id="file-description"
                  placeholder="Describe what this file is for..."
                  value={newFileDescription}
                  onChange={(e) => setNewFileDescription(e.target.value)}
                  className="bg-card/50 border-primary/20 focus:border-primary"
                />
              </div>
              
              <div className="border-2 border-dashed border-primary/20 rounded-lg p-8 text-center">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop files here, or click to browse
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse Files
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex space-x-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card/50 border-primary/20 focus:border-primary"
          />
        </div>
        
        <select
          value={selectedFileType}
          onChange={(e) => setSelectedFileType(e.target.value)}
          className="px-3 py-2 rounded-md border border-primary/20 bg-card/50 text-foreground"
        >
          <option value="all">All Files</option>
          <option value="images">Images</option>
          <option value="documents">Documents</option>
          <option value="code">Code Files</option>
        </select>
      </div>

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <Card className="bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Uploading Files</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(uploadProgress).map(([fileId, progress]) => (
              <div key={fileId} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Files Grid */}
      <div className="grid gap-4">
        {filteredFiles.length === 0 ? (
          <Card className="bg-card/50">
            <CardContent className="p-8 text-center">
              <File className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No files match your search' : 'No files uploaded yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredFiles.map((file) => {
            const IconComponent = getFileIcon(file.type);
            return (
              <Card key={file.id} className="bg-card/50 hover:shadow-card transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <IconComponent className="w-5 h-5 text-primary" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground text-sm truncate">
                          {file.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)} • Uploaded by {file.uploadedBy}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {file.uploadedAt.toLocaleDateString()} at {file.uploadedAt.toLocaleTimeString()}
                        </p>
                        {file.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {file.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {file.isShared && (
                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                          Shared
                        </Badge>
                      )}
                      
                      <div className="flex space-x-1">
                        {file.content && (
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        
                        <Button variant="outline" size="sm" onClick={() => handleDownload(file)}>
                          <Download className="w-4 h-4" />
                        </Button>
                        
                        <Button variant="outline" size="sm">
                          <Share2 className="w-4 h-4" />
                        </Button>
                        
                        {file.uploadedBy === userName && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDelete(file.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};