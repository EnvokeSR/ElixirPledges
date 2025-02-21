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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    defaultValues: {
      name: "",
      celebrity: "",
    },
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["users-not-submitted"],
    queryFn: async () => {
      try {
        const response = await fetch('/api/users/not-submitted');
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        const data = await response.json();
        console.log("Fetched users:", data);
        return data;
      } catch (error) {
        console.error("Error fetching users:", error);
        throw error;
      }
    const data = await response.json();
        console.log("Fetched users:", data);
        return data;
      } catch (error) {
        console.error("Error fetching users:", error);
        throw error;
      }
    },
    enabled: !!selectedGrade,
  });

  const { data: pledge, isLoading: isLoadingPledge } = useQuery({
    queryKey: ["/api/pledges", selectedUser?.pledgeCode],
    queryFn: async () => {
      if (!selectedUser?.pledgeCode) return null;
      const response = await fetch(`/api/pledges/${selectedUser.pledgeCode}`);
      if (!response.ok) {
        throw new Error('Failed to fetch pledge');
      }
      return response.json();
    },
    enabled: !!selectedUser?.pledgeCode,
  });

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
    form.setValue('name', ''); // Reset name when grade changes
    setSelectedUser(null); // Reset selected user when grade changes

    // Invalidate and refetch users for the new grade
    queryClient.invalidateQueries({ 
      queryKey: ["/api/users/grade", value],
      exact: true 
    });
  };

  const personalizedPledgeText = pledge?.pledgeText
    ? `I, ${selectedUser?.name}, pledge to, ${pledge.pledgeText}\n\nI nominate ${selectedUser?.favoriteCelebrity} to take this pledge with me.`
    : "";

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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!selectedGrade || isLoadingUsers}
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
                        {users.map((user: any) => (
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
                disabled={isLoadingUsers || isLoadingPledge}
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
              setSelectedUser(null);
              // Invalidate the users query to refresh the list
              queryClient.invalidateQueries({ 
                queryKey: ["/api/users/not-submitted"],
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