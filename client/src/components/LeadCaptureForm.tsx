import React from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface LeadCaptureFormProps {
  onSubmit: (name: string, email: string, phone: string, retreatDate?: string) => Promise<boolean>;
  onCancel: () => void;
}

// Validation schema
const formSchema = z.object({
  name: z.string().min(2, { message: 'Please enter your name' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  phone: z.string().optional(),
  retreatDate: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

/**
 * Form for capturing lead contact information
 */
export function LeadCaptureForm({ onSubmit, onCancel }: LeadCaptureFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submissionSuccess, setSubmissionSuccess] = React.useState(false);
  const [countdown, setCountdown] = React.useState(7); // Countdown in seconds
  
  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      retreatDate: '',
    },
  });
  
  // Handle form submission
  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      const success = await onSubmit(
        values.name,
        values.email,
        values.phone || '',
        values.retreatDate
      );
      
      if (success) {
        setSubmissionSuccess(true);
        
        // Start countdown timer
        const countdownInterval = setInterval(() => {
          setCountdown(prev => {
            const newCount = prev - 1;
            if (newCount <= 0) {
              clearInterval(countdownInterval);
              onCancel();
              return 0;
            }
            return newCount;
          });
        }, 1000);
      } else {
        form.setError('root', { 
          type: 'manual',
          message: 'Unable to submit your information. Please try again.' 
        });
      }
    } catch (error) {
      console.error('Error submitting lead form:', error);
      form.setError('root', { 
        type: 'manual',
        message: 'An error occurred. Please try again later.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Show success message
  if (submissionSuccess) {
    return (
      <Card className="w-full border border-[#767657]/30 shadow-md bg-gradient-to-br from-[#f8f8f6] to-white overflow-hidden">
        {/* Success icon and animation at the top */}
        <div className="bg-[#767657]/10 p-4 flex justify-center items-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-[#767657] flex items-center justify-center text-white">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="32" 
                height="32" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="animate-[bounce_1s_ease-in-out_1]"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <div 
              className="absolute inset-0 w-16 h-16 rounded-full border-4 border-[#767657] opacity-50"
              style={{animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'}}
            ></div>
          </div>
        </div>
        
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-xl font-medium text-[#767657] text-center">Thank You!</CardTitle>
          <CardDescription className="text-[#767657]/80 text-center">
            Your information has been successfully submitted
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="bg-white p-4 rounded-lg border border-[#767657]/10 mb-3">
            <p className="text-gray-700 text-center">
              A member of our team will be in touch with you via email shortly with personalized information about Aro Ha.
            </p>
          </div>
          <p className="text-[#767657]/70 text-sm text-center italic">
            We greatly appreciate your interest in our wellness retreat and look forward to helping you on your journey.
          </p>
          
          {/* Countdown indicator and continue button */}
          <div className="flex flex-col items-center mt-4 gap-3">
            <div className="px-3 py-1 rounded-full bg-[#767657]/10 text-[#767657]/80 text-xs flex items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-1"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Continuing in {countdown} seconds
            </div>
            
            <Button 
              onClick={onCancel}
              variant="outline"
              size="sm"
              className="text-xs h-7 border-[#767657]/30 text-[#767657] hover:bg-[#767657]/10 hover:text-[#767657]"
            >
              Continue Now
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Show form
  return (
    <Card className="w-full border border-[#767657]/30 shadow-md bg-gradient-to-br from-[#f8f8f6] to-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium text-[#767657]">Contact Information</CardTitle>
        <CardDescription className="text-[#767657]/80">
          Please provide your details and we'll be in touch
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#767657]">Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Your full name" 
                      {...field} 
                      className="border-[#767657]/30 focus:border-[#767657] focus:ring-[#767657]/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#767657]">Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="Your email address" 
                      {...field} 
                      className="border-[#767657]/30 focus:border-[#767657] focus:ring-[#767657]/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#767657]">Phone (optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="tel" 
                      placeholder="Your phone number" 
                      {...field} 
                      className="border-[#767657]/30 focus:border-[#767657] focus:ring-[#767657]/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="retreatDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#767657]">
                    Preferred Retreat Date (optional)
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder="e.g., July 2025" 
                      {...field} 
                      className="border-[#767657]/30 focus:border-[#767657] focus:ring-[#767657]/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {form.formState.errors.root && (
              <p className="text-red-500 text-sm">{form.formState.errors.root.message}</p>
            )}
            
            <div className="pt-2 flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel} 
                disabled={isSubmitting}
                className="border-[#767657]/30 text-[#767657] hover:bg-[#767657]/10 hover:text-[#767657]"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-[#767657] text-white hover:bg-[#767657]/90"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}