import { z } from "zod";

const addTwoNumbers = (a, b) => {
    return a + b;
};

export const addTwoNumbersTool = [
    "addTwoNumbers",
    "Add two numbers",
    {
        a: z.number(),
        b: z.number()
    },
    async (arg) => {
        const { a, b } = arg;
        const sum = addTwoNumbers(a, b);
        return {
            content: [
                {
                    type: "text",
                    text: `The sum of ${a} and ${b} is ${sum}`
                }
            ]
        }
    }
];