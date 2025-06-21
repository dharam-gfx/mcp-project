import { useState } from 'react';
import {
    Box,
    TextField,
    Button,
    Paper,
    Typography,
    Container,
    List,
    ListItem,
    ListItemText,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { handleChat } from '../../index.js';

const AIAgent = () => {
    const [input, setInput] = useState( '' );
    const [messages, setMessages] = useState( [] );

    const handleSubmit = async ( e ) => {
        e.preventDefault();
        if ( !input.trim() ) return;

        // Add user message to chat
        const userMessage = { role: 'user', content: input };
        setMessages( [...messages, userMessage] ); try {
            const aiResponse = await handleChat( input );

            // Add AI response to chat
            setMessages( prevMessages => [...prevMessages, {
                role: 'assistant',
                content: aiResponse
            }] );
        } catch ( error ) {
            console.error( 'Error:', error );
            setMessages( prevMessages => [...prevMessages, {
                role: 'assistant',
                content: 'I apologize, but I encountered an error while processing your request.'
            }] );
        }

        setInput( '' );
    };

    return (
        <Container maxWidth="md">
            <Paper elevation={3} sx={{ p: 3, mt: 4, height: '80vh', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h4" gutterBottom>
                    AI Agent Chat
                </Typography>

                <Box sx={{ flexGrow: 1, overflow: 'auto', mb: 2 }}>
                    <List>
                        {messages.map( ( message, index ) => (
                            <ListItem key={index} sx={{
                                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                            }}>
                                <Paper
                                    elevation={1}
                                    sx={{
                                        p: 2,
                                        maxWidth: '70%',
                                        bgcolor: message.role === 'user' ? 'primary.light' : 'grey.100',
                                        color: message.role === 'user' ? 'white' : 'text.primary'
                                    }}
                                >
                                    <ListItemText primary={message.content} />
                                </Paper>
                            </ListItem>
                        ) )}
                    </List>
                </Box>

                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                        fullWidth
                        value={input}
                        onChange={( e ) => setInput( e.target.value )}
                        placeholder="Type your message..."
                        variant="outlined"
                        size="small"
                    />
                    <Button
                        type="submit"
                        variant="contained"
                        endIcon={<SendIcon />}
                        disabled={!input.trim()}
                    >
                        Send
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default AIAgent;
