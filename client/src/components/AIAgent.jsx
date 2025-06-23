import { useState, useRef, useEffect } from 'react';
import { handleChat } from '../services/mcpClient';
import ReactMarkdown from 'react-markdown'; // Import ReactMarkdown
import remarkGfm from 'remark-gfm'; // Import remarkGfm for tables and other features

const AIAgent = () => {
    const [input, setInput] = useState( '' );
    const [messages, setMessages] = useState( [] );
    const [isLoading, setIsLoading] = useState( false );
    const messagesEndRef = useRef( null );

    // Auto-scroll to bottom when new messages appear
    useEffect( () => {
        messagesEndRef.current?.scrollIntoView( { behavior: 'smooth' } );
    }, [messages] );

    const handleClearChat = () => {
        setMessages( [] );
    };

    const handleSubmit = async ( e ) => {
        e.preventDefault();
        if ( !input.trim() ) return;

        // Add user message to chat
        const userMessage = { role: 'user', content: input };
        setMessages( [...messages, userMessage] );

        // Clear input early for better UX
        const currentInput = input;
        setInput( '' );

        // Set loading state
        setIsLoading( true );

        try {
            const aiResponse = await handleChat( currentInput );

            // Add AI response to chat
            setMessages( prevMessages => [...prevMessages, {
                role: 'assistant',
                // Ensure aiResponse is a string, as react-markdown expects a string
                content: typeof aiResponse === 'string' ? aiResponse : JSON.stringify( aiResponse, null, 2 )
            }] );
        } catch ( error ) {
            console.error( 'Error:', error );
            setMessages( prevMessages => [...prevMessages, {
                role: 'assistant',
                content: 'I apologize, but I encountered an error while processing your request.'
            }] );
        } finally {
            setIsLoading( false );
        }
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl flex flex-col h-[85vh] sm:h-[90vh] overflow-hidden border border-gray-100">
                {/* Header */}
                <div className="flex justify-between items-center px-4 sm:px-6 py-4 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
                    <h1 className="text-lg sm:text-xl font-semibold flex items-center gap-2 text-gray-800">
                        <svg className="w-6 h-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        AI Agent Chat
                    </h1>
                    <button
                        onClick={handleClearChat}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors duration-200"
                        title="Clear conversation"
                    >
                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>

                {/* Messages area */}
                <div className="flex-grow overflow-auto px-4 sm:px-6 py-4 bg-gradient-to-b from-gray-50 to-white">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col justify-center items-center text-gray-400">
                            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                                <svg className="w-10 h-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </div>
                            <p className="text-center font-medium mb-1">Welcome to AI Agent Chat</p>
                            <p className="text-sm text-gray-400">Start a conversation by typing a message below</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map( ( message, index ) => (
                                <div
                                    key={index}
                                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                                >
                                    {/* AI Avatar */}
                                    {message.role !== 'user' && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center text-white mr-2 flex-shrink-0 shadow-sm">
                                            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                                            </svg>
                                        </div>
                                    )}
                                    <div
                                        className={`p-3 rounded-2xl max-w-[85%] sm:max-w-[75%] shadow-sm ${message.role === 'user'
                                            ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-none'
                                            : 'bg-white rounded-bl-none border border-gray-100 text-gray-800'
                                            }`}
                                    >
                                        {/* Use ReactMarkdown here */}                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                table: ( props ) => (
                                                    <div className="overflow-x-auto my-4">
                                                        <table className="min-w-full divide-y divide-gray-200" {...props} />
                                                    </div>
                                                ),
                                                thead: ( props ) => (
                                                    <thead className="bg-gray-50" {...props} />
                                                ),
                                                th: ( props ) => (
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" {...props} />
                                                ),
                                                td: ( props ) => (
                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-t border-gray-200" {...props} />
                                                ),
                                                strong: ( props ) => (
                                                    <strong className="font-semibold" {...props} />
                                                ),
                                                a: ( props ) => (
                                                    <a className="text-blue-600 hover:underline" {...props} />
                                                ),
                                                ul: ( props ) => (
                                                    <ul className="list-disc ml-4 space-y-2 my-4" {...props} />
                                                ),
                                                ol: ( props ) => (
                                                    <ol className="list-decimal ml-4 space-y-2 my-4" {...props} />
                                                ),
                                                p: ( props ) => (
                                                    <p className="mb-4 last:mb-0" {...props} />
                                                ),
                                                code: ( { inline, className, children, ...props } ) => {
                                                    const match = /language-(\w+)/.exec( className || '' );
                                                    return !inline && match ? (
                                                        <pre className="overflow-x-auto my-2 rounded-md bg-gray-800 p-2">
                                                            <code className="text-sm text-white block" {...props}>
                                                                {children}
                                                            </code>
                                                        </pre>
                                                    ) : (
                                                        <code className="rounded-md bg-gray-100 px-1 py-0.5 text-blue-700 font-mono text-sm" {...props}>
                                                            {children}
                                                        </code>
                                                    );
                                                },
                                                blockquote: ( props ) => (
                                                    <blockquote className="border-l-4 border-gray-200 pl-4 my-4 italic text-gray-600" {...props} />
                                                )
                                            }}
                                        >
                                            {message.content}
                                        </ReactMarkdown>
                                    </div>
                                    {/* User Avatar */}
                                    {message.role === 'user' && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-400 to-gray-500 flex items-center justify-center text-white ml-2 flex-shrink-0 shadow-sm">
                                            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            ) )}
                            <div ref={messagesEndRef}></div>
                            {isLoading && (
                                <div className="flex items-center animate-fadeIn">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center text-white mr-3 shadow-sm">
                                        <svg className="w-4 h-4 animate-pulse" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                                        </svg>
                                    </div>
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Input area */}
                <div className="border-t border-gray-100 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
                    <form onSubmit={handleSubmit} className="flex gap-2 p-4 sm:p-4 max-w-4xl mx-auto">
                        <div className="relative flex-grow">
                            <textarea
                                value={input}
                                onChange={( e ) => setInput( e.target.value )}
                                placeholder="Type your message..."
                                className="w-full resize-none rounded-2xl pl-4 pr-12 py-3 bg-gray-50 focus:bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-200 text-sm sm:text-base text-gray-800 shadow-sm"
                                rows={1}
                                style={{ minHeight: '44px', maxHeight: '120px' }}
                                onKeyDown={( e ) => {
                                    if ( e.key === 'Enter' && !e.shiftKey ) {
                                        if ( input.trim() ) {
                                            e.preventDefault();
                                            handleSubmit( e );
                                        }
                                    }
                                }}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className=" absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                            >
                                <svg className="w-5 h-5 rotate-90" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AIAgent;