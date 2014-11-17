	
	var pane
	var api
	var channel
	$(document).ready(function() {
		channel = window.location.pathname.split('/')[1]
		$('#hiddenDiv').hide()
		$('#channel').val('http://'+window.location.host+'/'+channel);
		api = $('#chat').jScrollPane({
      		stickToBottom: true,
      		maintainPosition: true
    	}).data('jsp');

		if($.cookie('name') === undefined){
			$.fancybox.open({
				'autoDimensions' : true,
				'content': $('#hiddenDiv').show(),
				afterLoad: function(){
						setTimeout(function(){
							$('#name').focus();
								$('.infoLabel').text('').show()
								$('#name').bind('keyup', function(event){
									if($('#name').val().length>=9){
										$('.infoLabel').text('name to long')
									}
									else {
										$('.infoLabel').text('').show()
									}
									if(event.which == 13) {
										$('#ok-button').click()
									}
								})
								$('#ok-button').bind('click', function(event){
									if($('#name').val().length<9 || $('#name').val().length<1){
										$.cookie('name', $('#name').val(), { expires: 7, path: '/' });
					        			$('#welcome').append($('#name').val())
					        			data = {}
										data.name = $.cookie('name')
										data.channel = channel
										socket.emit('username', data)
					        			$.fancybox.close() 
									}
									else{
										$('.infoLabel').text('name to long')
									}
								})
								
						},400)	
				}
			});
		}	
		else {
			$.fancybox.close()
			$('#welcome').append($.cookie('name'))
			data = {}
			data.name = $.cookie('name')
			data.channel = channel
			socket.emit('username', data)
		}

		$('#chatInput').bind('keydown', function(e) {
	        if(e.which == 13) {
	        	e.preventDefault();
	        	data = {}
	        	data.name = $.cookie('name')
	        	data.date = new Date
	        	data.message = $('#chatInput').val()
	        	data.channel = channel
	        	if(data.message!==''){
	        		socket.emit('message', data)
	        	}
	        	$('#chatInput').val('')
	        }
	    })
	})

	var socket = io.connect(window.location.host, {
		'reconnect': true,
		'reconnection delay' : 500,
		'max reconnection attempts' : 10
	});

	var messageCounter = 0
	socket.on('message', function(data){
		var currentDate = new Date(data.date)
		$('<div/>', {
			class : 'post',
			id : messageCounter
		}).appendTo('.jspPane').fadeIn()
		$('<span/>', {
			class : 'author',
			text : data.name+':'
		}).appendTo('#'+messageCounter+'.post')
		$('<span/>', {
			class : 'text',
			text : data.message
		}).appendTo('#'+messageCounter+'.post')
		$('<span/>', {
			class : 'time',
			text : currentDate.getHours()+':'+ (currentDate.getMinutes()<10?'0':'') + currentDate.getMinutes()
		}).appendTo('#'+messageCounter+'.post')
		messageCounter++
		api.reinitialise();
	})

	socket.on('count', function(data){		
		$('#viewCounter').text(data+' viewers')
	})

	socket.on('videoID', function(data){
		loadURL(data)
	})

	socket.on('playVideo', function(data){
		if(data.playVideo){
			player.playVideo();
		}
		else{
			player.pauseVideo()
		}
	})

	socket.on('sync', function(data){
        player.seekTo(data, true)
	})

 	// 2. This code loads the IFrame Player API code asynchronously.
	var tag = document.createElement('script');
	tag.src = "//www.youtube.com/iframe_api";
	var firstScriptTag = document.getElementsByTagName('script')[0];
	firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

	// 3. This function creates an <iframe> (and YouTube player)
	//    after the API code downloads.
	var player;
  	function onYouTubeIframeAPIReady() {
    	player = new YT.Player('player', {
	      	height: '390',
	      	width: '640',
	      	videoId: '',
			playerVars : {
            	controls : 1,
            	iv_load_policy : 3
			},
	      	events: {
	        	'onReady': onPlayerReady,
	        	'onStateChange': onPlayerStateChange
	      	}
    	});
  	}

  	// 4. The API will call this function when the video player is ready.
  	function onPlayerReady(event) {
  		if($.cookie('name') != undefined){
  			data.date = new Date()
  			socket.emit('guestReady', data)
    		currentSecond()
    		event.target.playVideo();
  		}
  	}

	// 5. The API calls this function when the player's state changes.
	//    The function indicates that when playing a video (state=1),
	//    the player should play for six seconds and then stop.
	var play = false;
  	function onPlayerStateChange(event) {
	    if (event.data == YT.PlayerState.PLAYING ) {
	      	play = true;
	      	currentSecond();
	    }
	    if (event.data == YT.PlayerState.PAUSED) {
	    	play = false;
	    	clearInterval(send);
	    }
  	}

	function loadURL(videoID) {
    	player.cueVideoById(videoID, 0, 'medium')
    	$.get('https://gdata.youtube.com/feeds/api/videos/'+videoID+'?v=2&alt=json', function(data) {
  			$('.VideoTitle').html(data.entry.title.$t)
		});
    }

    var send
	function currentSecond() {
		player.playVideo();
		clearInterval(send);
			send = setInterval(function(){
				data.currentTime = player.getCurrentTime()
				socket.emit('currentTime', data);
			}, 1000)
	}

	function showFancyBox() {
		$.removeCookie('name');
		$.fancybox.open({
			'autoDimensions' : true,
			'content': $('#hiddenDiv').show(),
			afterLoad: function(){
				if($.cookie('name') === undefined){
					$('#name').focus();	
					$(document).keypress(function(e) {
				        if(e.which == 13) {
				        	e.preventDefault();
				           	$.cookie('name', $('#name').val(), { expires: 7, path: '/' });
				        	$('#welcome').append($('#name').val())
				        	data = {}
							data.name = $.cookie('name')
							data.channel = channel
							socket.emit('username', data)
				        	$.fancybox.close()       
				        }
	 				});
					$('.fancybox-close').click(function(){
						$.cookie('name', $('#name').val(), { expires: 7, path: '/' });
						$('#welcome').append($('#name').val())
						data = {}
						data.name = $.cookie('name')
						data.channel = channel
						socket.emit('username', data)
						$.fancybox.close()
					})
				}
			}
		});
	}

  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-41327155-1', 'jit.su');
  ga('send', 'pageview');

