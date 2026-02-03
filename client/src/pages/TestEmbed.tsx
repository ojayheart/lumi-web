import { useState, useEffect, useLayoutEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import CustomChatWidgetContainer from "../components/CustomChatWidgetContainer";

export default function TestEmbed() {
  const [currentTab, setCurrentTab] = useState('features');
  const [clickCount, setClickCount] = useState(0);
  const [lastClicked, setLastClicked] = useState('None');
  
  const handleClick = (elementName: string) => {
    setClickCount(prev => prev + 1);
    setLastClicked(elementName);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6">
      <header className="max-w-5xl mx-auto mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Aro Ha Widget Test Page</h1>
        
        <Menubar className="border-none shadow-sm">
          <MenubarMenu>
            <MenubarTrigger onClick={() => handleClick('Home Menu')}>Home</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onClick={() => handleClick('Dashboard Item')}>Dashboard</MenubarItem>
              <MenubarItem onClick={() => handleClick('Profile Item')}>Profile</MenubarItem>
              <MenubarSeparator />
              <MenubarItem onClick={() => handleClick('Settings Item')}>Settings</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger onClick={() => handleClick('Products Menu')}>Products</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onClick={() => handleClick('Retreats Item')}>Retreats</MenubarItem>
              <MenubarItem onClick={() => handleClick('Wellness Item')}>Wellness</MenubarItem>
              <MenubarItem onClick={() => handleClick('Nutrition Item')}>Nutrition</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger onClick={() => handleClick('About Menu')}>About</MenubarTrigger>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger onClick={() => handleClick('Contact Menu')}>Contact</MenubarTrigger>
          </MenubarMenu>
        </Menubar>
      </header>
      
      <main className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-3/4">
            <section className="mb-10">
              <div className="bg-white p-8 rounded-xl shadow-md mb-6">
                <h2 className="text-2xl font-semibold mb-4">Widget Embed Test Environment</h2>
                <p className="text-gray-600 mb-4">
                  This page is designed to test whether the embedded widget interferes with normal page interactions.
                  Try clicking on different elements around the page while the widget is both minimized and expanded.
                </p>
                <div className="p-4 bg-blue-50 rounded-lg mb-4">
                  <p className="font-medium">Test Results:</p>
                  <p>Click count: <span className="font-bold">{clickCount}</span></p>
                  <p>Last clicked: <span className="font-bold">{lastClicked}</span></p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  <Button onClick={() => handleClick('Primary Button')} variant="default">Primary Button</Button>
                  <Button onClick={() => handleClick('Secondary Button')} variant="secondary">Secondary Button</Button>
                  <Button onClick={() => handleClick('Outline Button')} variant="outline">Outline Button</Button>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" onClick={() => handleClick('Dropdown Button')}>Open Dropdown</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleClick('Dropdown Item 1')}>Option 1</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleClick('Dropdown Item 2')}>Option 2</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleClick('Dropdown Item 3')}>Option 3</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </section>
            
            <section>
              <Tabs defaultValue="features" className="w-full" onValueChange={setCurrentTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="features" onClick={() => handleClick('Features Tab')}>Features</TabsTrigger>
                  <TabsTrigger value="pricing" onClick={() => handleClick('Pricing Tab')}>Pricing</TabsTrigger>
                  <TabsTrigger value="faq" onClick={() => handleClick('FAQ Tab')}>FAQ</TabsTrigger>
                </TabsList>
                <TabsContent value="features" className="bg-white p-6 rounded-b-lg shadow-md">
                  <h3 className="text-xl font-medium mb-4">Key Features</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Text chat with Voiceflow integration</li>
                    <li>Voice chat with ElevenLabs integration</li>
                    <li>Transparent backgrounds and custom styling</li>
                    <li>Minimizable interface that doesn't block page interaction</li>
                  </ul>
                </TabsContent>
                <TabsContent value="pricing" className="bg-white p-6 rounded-b-lg shadow-md">
                  <h3 className="text-xl font-medium mb-4">Pricing Options</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Basic</CardTitle>
                        <CardDescription>Essential features</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">$99</p>
                        <p className="text-sm text-gray-500">per month</p>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full" onClick={() => handleClick('Basic Plan Button')}>Choose Plan</Button>
                      </CardFooter>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Pro</CardTitle>
                        <CardDescription>Advanced features</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">$199</p>
                        <p className="text-sm text-gray-500">per month</p>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full" onClick={() => handleClick('Pro Plan Button')}>Choose Plan</Button>
                      </CardFooter>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Enterprise</CardTitle>
                        <CardDescription>Custom solutions</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">$399</p>
                        <p className="text-sm text-gray-500">per month</p>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full" onClick={() => handleClick('Enterprise Plan Button')}>Choose Plan</Button>
                      </CardFooter>
                    </Card>
                  </div>
                </TabsContent>
                <TabsContent value="faq" className="bg-white p-6 rounded-b-lg shadow-md">
                  <h3 className="text-xl font-medium mb-4">Frequently Asked Questions</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium">How does the widget work?</h4>
                      <p className="text-gray-600">The widget uses iframe embedding technology to integrate AI chat capabilities into your website.</p>
                    </div>
                    <div>
                      <h4 className="font-medium">Can I customize the appearance?</h4>
                      <p className="text-gray-600">Yes, the widget is fully customizable to match your brand style.</p>
                    </div>
                    <div>
                      <h4 className="font-medium">Does it work on mobile devices?</h4>
                      <p className="text-gray-600">Yes, the widget is responsive and works well on both desktop and mobile devices.</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </section>
          </div>
          
          <div className="w-full md:w-1/4">
            <div className="bg-white p-6 rounded-xl shadow-md mb-6">
              <h3 className="text-lg font-medium mb-3">Instructions</h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p>1. Interact with buttons & menus</p>
                <p>2. Test with widget minimized</p>
                <p>3. Test with widget expanded</p>
                <p>4. Check if any clicks are blocked</p>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-lg font-medium mb-3">Contact Us</h3>
              <p className="text-sm text-gray-600 mb-4">Have questions? Get in touch!</p>
              <Button className="w-full" onClick={() => handleClick('Contact Us Button')}>Send Message</Button>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="max-w-5xl mx-auto mt-12 py-6 border-t border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500">&copy; 2025 Aro Ha. All rights reserved.</p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <a href="#" className="text-gray-500 hover:text-gray-700" onClick={() => handleClick('Privacy Link')}>Privacy Policy</a>
            <a href="#" className="text-gray-500 hover:text-gray-700" onClick={() => handleClick('Terms Link')}>Terms of Service</a>
            <a href="#" className="text-gray-500 hover:text-gray-700" onClick={() => handleClick('Contact Link')}>Contact</a>
          </div>
        </div>
      </footer>
      
      {/* Widget container - make sure the widget has proper interaction */}
      <div id="custom-widget" className="z-50">
        <CustomChatWidgetContainer />
      </div>
    </div>
  );
}