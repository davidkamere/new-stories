import { io } from 'socket.io-client'

let socket

export const setUpSocket = () => {
    
    socket = io('http://137.184.185.173:80')


    socket.on('connect', () => {
        console.log('Connected to server');
        // Send a test message
        socket.emit('test', 'This is a test message from client');
    });


    return socket


}
