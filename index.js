const { Server } = require('socket.io')

const io = new Server({
	cors: {
		origin: '*',
		methods: ['GET', 'POST'],
	},
})

io.on('connection', (socket) => {
	console.log('socket server is running...')
})

io.listen(8000)
