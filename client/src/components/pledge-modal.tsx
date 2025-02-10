import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import VideoRecorder from "./video-recorder";
import { useToast } from "@/hooks/use-toast";

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

  const form = useForm<FormData>({
    defaultValues: {
      grade: "",
      name: "",
      celebrity: "",
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users/grade", form.watch("grade")],
    queryFn: () =>
      fetch(`/api/users/grade/${form.watch("grade")}`).then((res) =>
        res.json(),
      ),
    enabled: !!form.watch("grade"),
  });

  const { data: pledge } = useQuery({
    queryKey: ["pledge", selectedUser?.pledgeCode],
    queryFn: () =>
      fetch(`/api/pledges/${selectedUser?.pledgeCode}`).then((res) =>
        res.json(),
      ),
    enabled: !!selectedUser,
  });

  const onSubmit = (data: FormData) => {
    const user = users.find((u: any) => u.name === data.name);
    if (user) {
      setSelectedUser({ ...user, favoriteCelebrity: data.celebrity });
      setStep(2);
    }
  };

  const personalizedPledgeText = pledge?.pledgeText
    ? `I, ${selectedUser?.name}, pledge to, ${pledge.pledgeText}\n\nI nominate ${selectedUser?.favoriteCelebrity} to take this pledge with me.`
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {step === 1 ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your grade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="8th">8th Grade</SelectItem>
                        <SelectItem value="7th">7th Grade</SelectItem>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your name" />
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

              <Button type="submit" className="w-full">
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
            }}
            userData={selectedUser}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
