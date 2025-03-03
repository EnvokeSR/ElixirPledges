import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import VideoRecorder from "./video-recorder";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface PledgeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  grade: string;
  name: string;
  celebrity: string;
}

export default function PledgeModal({ open, onOpenChange }: PledgeModalProps) {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [selectedGrade, setSelectedGrade] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    defaultValues: {
      grade: "",
      name: "",
      celebrity: "",
    },
  });

  // Simple health check query
  const { isError: isHealthCheckError, error: healthCheckError } = useQuery({
    queryKey: ["/api/health"],
    queryFn: async () => {
      const response = await api.fetch("/api/health");
      return response;
    },
    retry: 2,
    retryDelay: 1000,
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/users/grade", selectedGrade],
    queryFn: async () => {
      if (!selectedGrade) return [];
      const response = await api.fetch<any[]>(`/api/users/grade/${selectedGrade}`);
      return response;
    },
    enabled: !!selectedGrade && !isHealthCheckError,
    retry: 2,
  });

  const { data: pledge, isLoading: isLoadingPledge } = useQuery({
    queryKey: ["/api/pledges", selectedUser?.pledgeCode],
    queryFn: async () => {
      if (!selectedUser?.pledgeCode) return null;
      const response = await api.fetch(`/api/pledges/${selectedUser.pledgeCode}`);
      return response;
    },
    enabled: !!selectedUser?.pledgeCode && !isHealthCheckError,
    retry: 2,
  });

  if (isHealthCheckError) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle className="text-2xl font-bold mb-4">
            Service Unavailable
          </DialogTitle>
          <p className="text-destructive">
            {healthCheckError instanceof Error ? healthCheckError.message : "The service is currently unavailable. Please try again later."}
          </p>
          <Button 
            className="mt-4"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/health"] });
            }}
          >
            Retry Connection
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  const onSubmit = (data: FormData) => {
    const user = users.find((u: any) => u.name === data.name);
    if (user) {
      setSelectedUser({ ...user, favoriteCelebrity: data.celebrity });
      setStep(2);
    }
  };

  const handleGradeChange = (value: string) => {
    console.log("Grade changed to:", value);
    setSelectedGrade(value);
    form.setValue('grade', value);
    form.setValue('name', ''); 
    setSelectedUser(null); 
  };

  const personalizedPledgeText = pledge?.pledgeText
    ? `I, ${selectedUser?.name}, pledge to, ${pledge.pledgeText}\n\nI nominate ${selectedUser?.favoriteCelebrity} to take this pledge with me.`
    : "";

  const filteredUsers = selectedGrade
    ? users.filter((user: any) => user.grade.toLowerCase() === selectedGrade.toLowerCase())
    : users;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogTitle className="text-2xl font-bold mb-4">
          Take The Pledge
        </DialogTitle>
        {step === 1 ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade</FormLabel>
                    <Select
                      onValueChange={handleGradeChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your grade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="8th">8th</SelectItem>
                        <SelectItem value="7th">7th</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoadingUsers || !selectedGrade}
                    >
                      <FormControl>
                        <SelectTrigger>
                          {isLoadingUsers ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Loading names...</span>
                            </div>
                          ) : (
                            <SelectValue placeholder="Select your name" />
                          )}
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredUsers.map((user: any) => (
                          <SelectItem key={user.id} value={user.name}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="celebrity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Favorite Celebrity</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter celebrity name" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isLoadingUsers || isLoadingPledge || !form.getValues('name') || !form.getValues('celebrity')}
              >
                Continue
              </Button>
            </form>
          </Form>
        ) : (
          <VideoRecorder
            pledgeText={personalizedPledgeText}
            onBack={() => setStep(1)}
            onComplete={() => {
              toast({
                title: "Success!",
                description: "Your video has been saved successfully.",
              });
              onOpenChange(false);
              setStep(1);
              form.reset();
              setSelectedGrade("");
              setSelectedUser(null);
              queryClient.invalidateQueries({
                queryKey: ["/api/users/grade", selectedGrade],
                exact: true
              });
            }}
            userData={selectedUser}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}