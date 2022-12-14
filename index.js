const express = require('express')
const http = require('http')
const socket = require('socket.io')

const index = require('./routes/index')

const app = express()

const server = http.createServer(app)
const PORT = 8000

app.use(index)

const io = socket(server, {
	cors: {
		origin: '*',
		methods: ['GET', 'POST'],
	},
})

let users = []

const addUser = (currentUser, socketId, userProfile) => {
	const checkCurrentUser = users.some((user) => user.currentUser === currentUser)

	if (!checkCurrentUser) {
		users.push({ currentUser, socketId, userProfile })
	}
}

const removeUser = (socketId) => {
	users = users.filter((user) => user.socketId !== socketId)
}

const findUser = (receiverId) => {
	return users.find((user) => user.currentUser === receiverId)
}

const userLogout = (currentUser) => {
	users = users.filter((user) => user.currentUser !== currentUser)
}

io.on('connection', (socket) => {
	console.log('socket server is running...')

	socket.on('addUser', (currentUser, userProfile) => {
		console.log(`currUser:${currentUser}\nsocketId: ${socket.id}\n${userProfile}\n has connected.`)
		addUser(currentUser, socket.id, userProfile)
		io.emit('getUser', users)
	})

	socket.on('typingMessage', (data) => {
		const user = findUser(data.receiverId)

		if (user !== undefined) {
			socket.to(user.socketId).emit('getTypingMessage', {
				senderId: data.senderId,
				receiverId: data.receiverId,
				message: data.message,
			})
		}
	})

	socket.on('sendMessage', (data) => {
		const user = findUser(data.receiverId)
		const userCurrent = findUser(data.senderId)

		if (user !== undefined) {
			socket.to(user.socketId).emit('getMessageReceiver', {
				senderId: data.senderId,
				receiverId: data.receiverId,
				message: {
					text: data.message.text,
					image: data.message.image,
				},
				createAt: data.time,
			})
		}

		// handle realtime last message to current user
		if (userCurrent !== undefined) {
			socket.to(userCurrent.socketId).emit('getMessageSender', {
				senderId: data.senderId,
				receiverId: data.receiverId,
				message: {
					text: data.message.text,
					image: data.message.image,
				},
				createAt: data.time,
			})
		}
	})

	socket.on('deliveredMessage', (data) => {
		const user = findUser(data.receiverId)
		const userCurrent = findUser(data.senderId)

		if (user !== undefined) {
			socket.to(user.socketId).emit('getDeliveredReceiver', data)
		}

		if (userCurrent !== undefined) {
			socket.to(userCurrent.socketId).emit('getDeliveredSender', data)
		}
	})

	socket.on('seenMessage', (data) => {
		const user = findUser(data.receiverId)
		const userCurrent = findUser(data.senderId)

		if (user !== undefined) {
			socket.to(user.socketId).emit('getSeenReceiver', data)
		}

		if (userCurrent !== undefined) {
			socket.to(userCurrent.socketId).emit('getSeenSender', data)
		}
	})

	socket.on('logout', (currentUser) => {
		console.log(`${currentUser} has disconnected.`)
		userLogout(currentUser)
	})

	socket.on('disconnect', () => {
		console.log('User is disconnected..')
		removeUser(socket.id)
		io.emit('getUser', users)
	})
})

server.listen(PORT, () => console.log(`Listening on port ${PORT}`))
