import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface LeadMagnetPromptProps {
  prompt: string;
  onResponse: (response: 'yes' | 'no') => void;
}

/**
 * Component that displays a lead magnet prompt to the user
 */
export function LeadMagnetPrompt({ prompt, onResponse }: LeadMagnetPromptProps) {
  return (
    <Card className="w-full border border-[#767657]/30 shadow-md bg-gradient-to-br from-[#f8f8f6] to-white">
      <CardContent className="pt-4">
        <p className="text-gray-700">{prompt}</p>
      </CardContent>
      
      <CardFooter className="flex justify-end space-x-2 pt-2">
        <Button 
          variant="outline" 
          onClick={() => onResponse('no')}
          className="border-[#767657]/30 text-[#767657] hover:bg-[#767657]/10 hover:text-[#767657]"
        >
          No thanks
        </Button>
        <Button 
          onClick={() => onResponse('yes')}
          className="bg-[#767657] text-white hover:bg-[#767657]/90"
        >
          Yes, please
        </Button>
      </CardFooter>
    </Card>
  );
}