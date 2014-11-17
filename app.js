	
var express = require('express')
var mongoose = require('mongoose')
var app = express();
var http = require('http')
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var MemoryStore = express.session.MemoryStore
var sessionStore = new MemoryStore()
var Session = require('express/node_modules/connect').middleware.session.Session;

/*
* - Config
*/

var sessionKey = 'geheimerSessionKey1313'
var standardConnection = mongoose.createConnection('Connection eintragen')
var backupConnection = mongoose.createConnection('Connection eintragen')

app.configure(function(){
	app.set('port', process.env.PORT || 4000);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.logger());
	app.use(express.cookieParser() )
	app.use(express.session({
		store : sessionStore,
		secret : sessionKey,
		cookie : {
			maxAge : 3000000
		}
	}))
	app.use(express.bodyParser());
	app.use(express.favicon('public/images/facicon.ico'));
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));
})

//io.set('transports', ['xhr-polling']);

io.configure(function(){
	io.set('authorization', function(data, accept){
		if(data.headers.cookie){
			data.cookie = require('express/node_modules/cookie').parse(data.headers.cookie);
			data.sessionID = data.cookie['connect.sid'].split('.')[0];
			sessionStore.get(data.sessionID, function(err, session) {
				if(err || session){
					console.log('konnte nicht geholt werden')
					// wenn die Session nicht geholt werden konnte, soll die Verbindung getrennt werden
					accept('Error', false)
				}
				else {
					console.log('konnte geholt werden')
					accept(null, true);
				}
			})
		}
		else {
			return accept('No cookie transmitted.', false);
		}
		accept(null, true);
	})
})
var host = {}
var guest = {}
var tolerance = 3
var users = 0
var activeUsers = new Array();

var chatLogSchema = new mongoose.Schema({
	name: String,
	message: String,
	date: Date,
	channel: String
},{
	capped: {
		size : 10000,
		autoIndexId : true
	}
});

var videoIdLogSchema = new mongoose.Schema({
	videoURL: String
})

var videoIDLog = standardConnection.model('VideoID', videoIdLogSchema);
var Message = standardConnection.model('Message', chatLogSchema);

// http://www.youtube.com/watch?v=WIXv0sMAjlY

io.sockets.on('connection', function(socket) {

	socket.on('username', function(data){
		
		activeUsers.push(data.name)
		users++
		socket.channel = data.channel
		socket.name = data.name
		if(data.channel === data.name){ // socket ist Host
			host.channelName = data.name
			host[data.channel] = {}
			host[data.channel].hostTime = null
			host[data.channel].currentVideo = ""
			host[data.channel].guestSocket = socket
			host[data.channel].guests = new Array()
		}
		else { // socket ist Gast
			guest.name = data.name
			guest.guestTime = null
			guest.guestSocket = socket
			host[data.channel].guests.push(guest)
		}
		socket.join(data.channel)
		Message.find({channel: data.channel}, function(err, docs){
			for(id in docs){
				var tempMessage = {}
				tempMessage.name = docs[id].name
				tempMessage.message = docs[id].message
				tempMessage.date = docs[id].date
				socket.emit('message', tempMessage)
			}
		})
		socket.emit('videoID', host[data.channel].currentVideo)
		io.sockets.in(data.channel).emit('count', io.sockets.clients(data.channel).length)
	})

	socket.on('message', function(data){
		new Message({
			name : data.name,
			message: data.message,
			date : data.date,
			channel: data.channel
		}).save(function(err, docs){
			if(err){
				console.log(err)
			}
			else {
				console.log(docs)
			}
		})
		io.sockets.in(data.channel).emit('message', data)
	})

	socket.on('playVideo', function(data){
		io.sockets.in(data.name).emit('playVideo', data)
	})

	socket.on('videoID', function(data){
		host[data.channel].currentVideo = data.videoID
		io.sockets.in(data.name).emit('videoID', data.videoID)
		new videoIDLog({
			videoURL: data.videoID
		}).save()
	})

	socket.on('currentTime', function(data){
		console.log(data)
		if (data.name === data.channel){ // HostTime
			host[data.name].hostTime = parseInt(data.currentTime)
		}
		if (data.name !== data.channel){ // GuestTime
			for(x in host[data.channel].guests){
				if(host[data.channel].guests[x].name == data.name){
					host[data.channel].guests[x].guestTime = parseInt(data.currentTime)
				}
			}
		}
		for(y in host[data.channel].guests){
			if(host[data.channel].hostTime > (host[data.channel].guests[y].guestTime+tolerance) || (host[data.channel].hostTime+tolerance) < host[data.channel].guests[y].guestTime){
				socket.emit('sync', host[data.channel].hostTime)
			}
		}
	})

	socket.on('guestReady', function(data){
		socket.emit('videoID', host[data.channel].currentVideo)
		data.message = 'joined'
		io.sockets.in(data.channel).emit('message', data)
	})

   	socket.on('disconnect', function(){
   		data = {}
   		data.name = socket.name
   		index = activeUsers.indexOf(data.name) // Entfernt den Namen
   		activeUsers.splice(index, 1);
   		data.date = new Date()
   		data.message = 'left'
   		io.sockets.in(socket.channel).emit('message', data)
   		socket.leave(socket.channel)
   		io.sockets.in(socket.channel).emit('count', io.sockets.clients(socket.channel).length)
   	})
});

app.get('/', function(req, res){
	res.render('host.jade',{
		title: "YouGether - watch YouTube simultaneous"
	});
});

app.get('/:channelId', function(req, res){
	res.render('client.jade', {
		title: "Welcome to Channel "+req.channelId
	})
});

app.get('/admin/show', function(req, res){
	var rooms = ''
	var channelCount = (Object.keys(io.sockets.manager.rooms).length)-1
	for(var i=0; i<Object.keys(io.sockets.manager.rooms).length; i++){
		rooms = rooms + Object.keys(io.sockets.manager.rooms)[i]+ ' '
	}
	res.send('Rooms: '+rooms+' Anzahl der Channels: '+channelCount+' Users: '+users)
})

app.param('channelId', function(req, res, next){
	req.channelId = req.params.channelId;
	next()
});

var PersistentChatLogSchema = new mongoose.Schema({
	name: String,
	message: String,
	date: Date,
	channel: String
})

var backupMessage = backupConnection.model('Message', PersistentChatLogSchema)
setInterval(function(){
	Message.find({}, function(err, docs){
		if(err){
			console.log('fehler beim Finden')
		}
		else {
			saveLogs(docs)
		}
	})
}, 60*60*1000)

var saveLogs = function(data){
	for(x in data){
		new backupMessage({
			name : data[x].name,
			message : data[x].message,
			date : data[x].date,
			channel : data[x].channel
		}).save(function(err, docs){
			if(err){
				console.log('Fehler!')
			}
			else {
				Message.remove({}, function(err){
					console.log('chatlog wurde gelöscht')
				})
			}
		})
	}
}

server.listen(app.get('port'), function(){
  console.log('YouGether server listening on port ' + app.get('port'));
});