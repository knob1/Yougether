	
	var pane
	var api
	var data = {}
	var channel
	$(document).ready(function() {
		$('#hiddenDiv').hide()
		$('#channel').val('http://'+window.location.host+"/");
		api = $('#chat').jScrollPane({
      		stickToBottom: true,
      		maintainPosition: true
    	}).data('jsp');

		if($.cookie('name') === undefined){
			$.fancybox.open({
				'autoDimensions' : true,
				'content': $('#hiddenDiv').show(),
				helpers : { 
	  				overlay : {closeClick: false}
				},
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
										$('#channel').val($('#channel').val()+$('#name').val())
										data = {}
										data.name = $.cookie('name')
										data.channel = $.cookie('name')
										channel = $.cookie('name')
										socket.emit('username', data)
										$.fancybox.close()
									}
									else{
										$('.infoLabel').text('name to long')
									}
								})
								
						},400)	
					}
			})
		}
		else {
			$('#welcome').append($.cookie('name'))
			$('#channel').val($('#channel').val()+$.cookie('name'))
			data = {}
			data.name = $.cookie('name')
			data.channel = $.cookie('name')
			channel = $.cookie('name')
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

	    var delay = (function(){
  			var timer = 0;
  			return function(callback, ms){
    			clearTimeout (timer);
    			timer = setTimeout(callback, ms);
  			};
		})();
			$('#videourl').keyup(function(){
				$('#results').empty()
				if($('#videourl').val() != ''){
					delay(function(){
					var searchTerm = $('#videourl').val().replace(' ','+')
					$.get('https://gdata.youtube.com/feeds/api/videos?q='+searchTerm+'&orderby=relevance&alt=json', function(data){
						for(var i = 0; i<4; i++){
							var img = '<div id="videoImg"><img src="'+data.feed.entry[i].media$group.media$thumbnail[i].url+'" alt="'+data.feed.entry[i].title.$t+'" height="80" width="80"></div>'
							var title = '<a href="'+data.feed.entry[i].link[0].href+'" id="videoTitle_'+i+'">'+data.feed.entry[i].title.$t+'</a>'
							var author = '<p class="videoAuthor">'+data.feed.entry[i].author[0].name.$t+'</p>'
							var videoViews = '<p class="videoViews">'+data.feed.entry[i].yt$statistics.viewCount+" Views"+'</p>'
							$('<div/>', {
								id : 'res'+i,
								class : 'entry'
							}).hover(function(){
								$(this).css('background-color', '#eee');
							},function(){
								$(this).css('background-color', '#F6F6F6');
							}).append(img).append(title).bind('click', function(event){
								event.preventDefault();
								loadURL(event.target.href)
							}).append(author).append(videoViews).appendTo('#results')
						}
					})
				}, 300)
				}
			})
	});

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
    	event.target.playVideo();
  	}

	// 5. The API calls this function when the player's state changes.
	//    The function indicates that when playing a video (state=1),
	//    the player should play for six seconds and then stop.
	var play = false;
  	function onPlayerStateChange(event) {
	    if (event.data == YT.PlayerState.PLAYING ) {
	    	data.playVideo = true
	      	socket.emit('playVideo', data);
	      	play = true;
	      	currentSecond();
	    }
	    if (event.data == YT.PlayerState.PAUSED) {
	    	data.playVideo = false
	    	socket.emit('playVideo', data);
	    	play = false;
	    	clearInterval(send);
	    }
  	}

	function loadURL(ytURL) {
		videoID = ytURL.split("v=")[1]
		videoID = videoID.split("&")[0]
    	player.loadVideoById(videoID, 0, "medium");
    	player.stopVideo();
    	$.get('https://gdata.youtube.com/feeds/api/videos/'+videoID+'?v=2&alt=json', function(data) {
  			$('.VideoTitle').html(data.entry.title.$t)
		});
		data.videoID = videoID
    	socket.emit('videoID', data)
    }

    var send
	function currentSecond() {
		clearInterval(send);
		if(player.getPlayerState() === 1){
			send = setInterval(function(){
				data.currentTime = player.getCurrentTime()
				socket.emit('currentTime', data);
			}, 1000)
		}
	}

	function showFancyBox() {
		$.removeCookie('name');
		content = '<p class="startLabel">Please enter:</p><input type="text" name="name" id="name" placeholder="Your (Channel) Name" autocomplete="off" tabindex="1" class="txtinput"><div id="ok-button" class="startButton"> <p class="startButtonText">ok</p><a href="javascript:;" title="Ok" id="fancybox-ok" class="fancybox-close"></a></div><div id="no-button" class="startButton"> <p class="startButtonText">no</p><a href="javascript:;" title="No" class="fancybox-close"></a></div>'
		$('#channel').val('http://'+window.location.host+"/");
		$.fancybox.open({
			'autoDimensions' : true,
			'content': content,
			afterLoad: function(){
				$('#name').focus();	
				$(document).keypress(function(e) {
			        if(e.which == 13) {
			        	e.preventDefault();
			           	$.cookie('name', $('#name').val(), { expires: 7, path: '/' });
			        	data = {}
			        	data.prev = $('#welcome').text()
			        	$('#welcome').text('hi '+$('#name').val())
						data.name = $.cookie('name')
						data.channel = channel
						socket.emit('username', data)
			        	$.fancybox.close()       
			        }
 				});
				$('.fancybox-close').click(function(){
		           	$.cookie('name', $('#name').val(), { expires: 7, path: '/' });
		        	data = {}
		        	data.prev = $('#welcome').text()
		        	$('#welcome').text('hi '+$('#name').val())
					data.name = $.cookie('name')
					data.channel = channel
					socket.emit('username', data)
		        	$.fancybox.close()  
				})
			}
		});
	}

	function goToDiv(divName){
		if(divName=='video'){
			document.getElementById('content').scrollIntoView();
		}
		if(divName=='howTo'){
			document.getElementById('howtoAndSupport').scrollIntoView();
		}
		if(divName=='about'){
			document.getElementById('about').scrollIntoView();
		}
	}

	function hideResults(){
		setTimeout(function(){
			$('#results').empty()
		}, 400)
	}

  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-41327155-1', 'jit.su');
  ga('send', 'pageview');

