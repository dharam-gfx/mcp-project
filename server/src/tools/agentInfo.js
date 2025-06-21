import { z } from "zod";

// Helper function to return full information response
const getFullInfoResponse = (info) => {
    return {
        content: [
            {
                type: "text",
                text: `👋 Hello! I am ${info.name}!\n\n` +
                      `🔹 Created by: ${info.creator}\n` +
                      `🔹 Creator's Role: ${info.creatorRole}\n` +
                      `🔹 Creator's Expertise: ${info.expertise}\n` +
                      `🔹 Based in: ${info.location}\n\n` +
                      `💫 About Me:\n` +
                      `${info.description}\n` +
                      `${info.purpose}\n\n` +
                      `🛠️ What I Can Do:\n` +
                      `${info.capabilities}\n\n` +
                      `🤝 My Approach:\n` +
                      `${info.personality}`
            }
        ]
    };
};

const agentInfo = () => {
    return {
        name: "Enna",
        fullName:"Enna Gupta",
        creator: "Dharmendra Kumar",
        creatorRole: "Software Engineer",
        expertise: "AI Development, Web Development, Software Architecture",
        location: "India",
        purpose: "I'm designed to assist with coding tasks, answer questions, and help in software development",
        capabilities: "I can help with coding, debugging, project setup, and technical problem-solving",
        description: "I'm your dedicated AI programming assistant, ready to help with any software development tasks.",
        personality: "Professional, friendly, and focused on delivering accurate technical solutions"
    };
};

export const agentInfoTool = [
    "agentInfo",
    "Ask me: 'What is your name?', 'Who are you?', 'Tell me about yourself', 'Who is your creator?'",
    {
        query: z.string().optional().describe("The user's query or greeting"),
        type: z.enum(["name", "full_info", "greeting", "how_are_you"]).optional().describe("Type of interaction")
    },    async (args) => {        
        const info = agentInfo();
        
        // Extract the query to detect greeting patterns
        const query = args?.query?.toLowerCase() || "";
        
        // Log the incoming query for debugging
        console.log("Received query:", query);
        
        // Handle "how are you" type questions - putting this BEFORE other checks
        if (args?.type === "how_are_you" || 
            query === "how are you" ||
            query === "how are you?" ||
            query.includes("how are you") || 
            query.includes("how's it going") ||
            query.includes("how do you feel") ||
            query === "how r u" ||
            query === "how r u?" ||
            (query.includes("how") && query.includes("you") && !query.includes("name"))) {
            
            return {
                content: [
                    {
                        type: "text",
                        text: `I'm doing well, thank you for asking! I'm ${info.name}, ready to assist you with whatever you need. How can I help you today?`
                    }
                ]
            };
        }
          // Handle name questions
        if (args?.type === "name" || 
            query.includes("your name") || 
            query.includes("what are you called") ||
            query === "name" || 
            query === "name?") {
            return {
                content: [
                    {
                        type: "text",
                        text: `My name is ${info.name}! 😊`
                    }
                ]
            };
        }
        
        // Handle full name questions
        if (query.includes("full name") || 
            query === "full name" || 
            query === "full name?") {
            return {
                content: [
                    {
                        type: "text",
                        text: `My full name is ${info.fullName}. I was created by ${info.creator}.`
                    }
                ]
            };
        }
          
        // Handle greetings
        if (args?.type === "greeting" || 
            query.includes("hi") || 
            query.includes("hello") || 
            query.includes("hey") ||
            (query.length < 5 && !query.includes("who") && !query.includes("what"))) {
            
            // Special case for personalized greeting (when name is mentioned)
            if (query.includes(info.name.toLowerCase())) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Hello there! Yes, I'm ${info.name}. It's nice to chat with you. What can I help you with today? 😊`
                        }
                    ]
                };
            }
            
            // Regular greeting
            return {
                content: [
                    {
                        type: "text",
                        text: `Hi there! I'm ${info.name}. How can I help you today? 😊`
                    }
                ]
            };        }
          // Handle capability questions
        if (query.includes("what you can do") || 
            query.includes("what can you do") ||
            query.includes("your abilities") ||
            query.includes("your skills") ||
            query.includes("your capabilities") ||
            query.includes("help me with") ||
            query.includes("what do you do") ||
            query.includes("what are you capable of")) {
            
            return {
                content: [
                    {
                        type: "text",
                        text: `As ${info.name}, I can help you with:\n\n` +
                              `✅ ${info.capabilities}\n\n` +
                              `I can also answer questions about myself and provide information about my creator. Need something specific? Just ask! 😊`
                    }
                ]
            };
        }
        
        // Handle full info / about / who are you questions
        if (args?.type === "full_info" || 
            query === "full info" || 
            query === "full info?" ||
            query === "full_info" ||
            query === "about you" || 
            query === "about yourself" ||
            query === "tell me about you" ||
            query === "who are you" ||
            query === "who are you?" ||
            query === "tell me about yourself" ||
            query.includes("tell me about") ||
            query.includes("who are you")) {
            // Trigger full information response
            return getFullInfoResponse(info);
        }// Default to full information response
        return getFullInfoResponse(info);
    }
];
