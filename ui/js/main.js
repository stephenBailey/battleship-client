$(function () {
    var BS = {
        _vars: {
            testToken: (typeof ($.cookie('token_test_player') !== "undefined" && $.cookie('token_test_player') !== "null") ? $.cookie('token_test_player') : prompt("Please enter your token", "-orsGMSc789m-Jk_97jivA")),
            gameId : 0
        },

        _fn : {
            board : {
                showShipPlacement : function() {
                    console.log('Drawing ships placement');
                    $('.board li').removeClass('position');
                    $.ajax({
                        url: '/' + BS._vars.testToken + '/game/' + BS._vars.gameId + '/show.json',
                        cache: false,
                        success : function(positionsData) {
                            $.each(positionsData, function () {
                                $('.board li.' + this.x + '-' + this.y).addClass('position'); 
                            });
                        }
                    });

                },

                showOpponentShoots : function() {
                    $.ajax({
                        url: '/' + BS._vars.testToken + '/game/' + BS._vars.gameId + '/stats',
                        cache: false,
                        success : function(shootsData) {
                            if (shootsData.players.length === 1) {
                                alert('There\'s no opponent in this game');
                            } else {
                                BS._fn.game.data = shootsData;
                                BS._fn.game.gameId = BS._vars.gameId;
                                BS._fn.game.interval = 100;
                                BS._fn.game.currentUser = 0;
                                BS._fn.game.currentShot = [0, 0];
                                BS._fn.game.numOfFields = shootsData.width * shootsData.height;
                                BS._fn.game.data.boards.splice(1,1);
                                BS._fn.game.data.boards[0].id = 0;
                                BS._fn.game.firstFinished = true;
                                BS._fn.game.showNextShot(0);
                                
                            }

                        },
                        error: BS._fn.common.ajaxError
                    });
                },


                randomizeShips : function () {
                    console.log('Randomizing ships placement');
                    $.ajax({
                        url: '/' + BS._vars.testToken + '/game/' + BS._vars.gameId + '/randomize',
                        cache: false,
                        success: function (data) {
                            $('.board li').removeClass('position');
                            BS._fn.board.showShipPlacement();
                        },
                        error: BS._fn.common.ajaxError
                    });
                },


                canDrop : function(dst, src) {
                    $('.board .decision, .board .impossible').removeClass('decision impossible');
                    var dstx, dsty, impossible = false;
                    if (dst.is('.board li')) {
                        dstx = parseInt(dst.attr('x'));
                        dsty = parseInt(dst.attr('y'));
                        src.find('li.shape').each(function () {
                            var $field = $('.board .' + (parseInt($(this).attr('x')) + dstx) + '-' + (parseInt($(this).attr('y')) + dsty));
                            if ($field.length > 0) {
                                $field.addClass('decision');
                            } else {
                                impossible = true;
                            }
                        });
                        if (impossible) {
                            $('.board .decision').addClass('impossible');
                        } else {
                            return true;
                        }
                    }
                    return false;
                },

                didDrop : function (src, dst) {
                    var dstx = parseInt(dst.attr('x')),
                        dsty = parseInt(dst.attr('y')),
                        type = src.attr('type'),
                        variant = src.attr('variant');
                    console.log('Dropped ' + type + ' variant ' + variant + ', x=' + dstx + ', y=' + dsty);
                    $.ajax({
                        url: '/' + BS._vars.testToken + '/game/' + BS._vars.gameId + '/set?ships[][type]=' + type + '&ships[][variant]=' + variant + '&ships[][xy][]=' + dstx + '&ships[][xy][]=' + dsty,
                        cache: false,
                        success: function (data) {
                            if (data && data.status) {
                                $('.board .decision').addClass('position').removeClass('decision');
                                console.log('Succesfull placement');
                                $('.available-ships .ship[type="' + type + '"]').hide();
                            } else {
                                $('.board .decision, .board .impossible').removeClass('decision impossible');
                                console.log('Placement not possible');
                            }

                        }
                    });
                }
            },

            common : {
                logIn: function () {
                    BS._vars.testToken = prompt("Please enter your token", "-orsGMSc789m-Jk_97jivA");
                    $.cookie('token_test_player', BS._vars.testToken);
                    BS._fn.common.updateLoginUi();
                },
                updateLoginUi: function () {
                    var that = this;
                    $.getJSON(BS._fn.common.serverUrlWithToken() + "mystats?callback=?", function (response) {
                        if (response.error) {
                            alert("Unable to Sign In: " + response.error);
                            $("#menuLogIn").text("Sign In");
                            return
                        }
                        $("#menuLogIn").text("Sign out " + response.name);
                    });
                },
                serverUrlWithToken: function () {
                    return "../" + BS._vars.testToken + "/";
                },
                ajaxError : function(xhr, status) {
                    console.log('Something went wrong: ' + status);
                },

                clearScreen : function (completeCallback) {
                    $('.body').fadeOut(function () {
                        $(this).html('');
                        completeCallback();
                        $(this).fadeIn();
                    });
                }
            },

            showInitBox: function () {
                $('.body').load('/ui/dialogs/login.html', function () {
                    $('#show_all_games').click(function () {
                        BS._fn.common.clearScreen(function () {
                            BS._fn.showAllGames();
                        });
                    });
                    $('#create_test_game').click(function () {
                        BS._fn.common.clearScreen(function () {
                            BS._fn.createTestGame();
                        });
                    });
                });
            },

            createTestGame: function () {
                $.ajax('/' + BS._vars.testToken + '/game/new', {
                    cache: false,
                    success: function (data) {
                        if (data.error) {
                            alert('Error: ' + data.error[0]);
                        } else {
                            BS._fn.arrangeTestGame(data);
                        }
                    },
                    error: BS._fn.common.ajaxError
                });
            },


            renderGameList: function (data) {
                var $gameList = $('<table/>', {class: 'table table-striped table-hover game-list'});
                $gameList.html('<thead><th>Game Id</th><th>Player 1</th><th>Player 2</th><th>Width</th><th>Height</th><th>Options</th></thead>');
                $gameList.append('<tbody>');
                $.each(data, function () {
                    var $game = $('<tr/>', {id: this.id, status: this.status});
                    $game.html('<td>' + this.id + '</td>');
                    $game.append('<td>' + this.players[0].name + '</td>');
                    if (this.players[1]) {
                        $game.append('<td>' + this.players[1].name + '</td>');
                    } else {
                        $game.append('<td> - </td>');
                    }
                    $game.append('<td>' + this.width + '</td>');
                    $game.append('<td>' + this.height + '</td>');
                    $game.append('<td><button type="button" class="show-game-progress btn btn-info btn-xs">Show Game Progress</button></td>');
                    $gameList.append($game);
                });
                $gameList.append('</tbody');
                $('.body').append('<h1>List of all games</h1>');
                $('.body').append($gameList);

                $('.show-game-progress').click(function () {
                    var gameId = $(this).parent().parent().attr("id");
                    BS._fn.common.clearScreen(function () {
                        BS._fn.game.displayGame(gameId);
                    });
                });
            },

            showAllGames: function () {
                that = this;
                $.ajax('/game/listforpreview', {
                    cache: false,
                    success: that.renderGameList,
                    error: BS._fn.common.ajaxError
                });

            },

            createShipTemplate : function () {
                var $shipTemplate = $('<ul/>').addClass('ship');
                for (var y = 0; y < 8; y++) {
                    for (var x = 0; x < 8; x++) {
                        $('<li/>', {x: x, y: y}).addClass(x.toString() + '-' + y.toString()).appendTo($shipTemplate);
                    }
                }
                return $shipTemplate;

            },

            renderAvailableShips : function (data) {
                $.each(data, function (index, value) {
                    var type = index;
                    $.each(value, function (index, value) {
                        var variant = index;
                        var $ship = $shipTemplate.clone();
                        $ship.attr('type', type);
                        $ship.attr('variant', variant);
                        $ship.addClass(type);
                        $.each(value, function (index, value) {
                            $ship.find('.' + value.x + '-' + value.y).addClass('shape');
                        });
                        $('.available-ships').append($ship);
                    });
                });
            },

            renderTestControls : function () {
                        $('.body').append('<h1>Game Id: ' + BS._vars.gameId + '</h1>');
                        $('.body').append('<button id="show_shoots" type="button" class="btn btn-primary">Show opponent shoots</button>');
                        $('.body').append('<button id="randomize_ships" type="button" class="btn btn-primary">Randomize ships</button>');
//                        $('.body').append('<button id="reset_game" type="button" class="btn btn-primary">Reset this game</button>');
                        $('.body').append($('<div/>', {class: 'available-ships'}));
                        $('#show_shoots').click(function () {
                            BS._fn.board.showOpponentShoots(BS._vars.gameId);   
                        });
                        $('#randomize_ships').click(BS._fn.board.randomizeShips);
//                        $('#reset_game').click(function () {
//                            $.ajax({
//                                url: '/' + BS._vars.testToken + '/game/' + gameId + '/restart',
//                                cache: false,
//                                success: function (data) {
//                                    BS._fn.board.showShipPlacement(gameId);
//                                },
//                                error: BS._fn.common.ajaxError
//                            });
//                        });
            },

            arrangeTestGame: function (data) {
                var gameId = data.id;
                BS._vars.gameId = gameId;
                $shipTemplate = this.createShipTemplate();
                $.ajax({
                    url: '/ship/list',
                    cache: false,
                    async: false,
                    success: function (data) {
                        BS._fn.renderTestControls();
                        BS._fn.renderAvailableShips(data);

                        $('.available-ships .ship').dragdrop({
                            clone: true,
                            dragClass: 'dragging',
                            canDrop: BS._fn.board.canDrop,
                            didDrop: BS._fn.board.didDrop
                        });
                    },
                    error : BS._fn.common.ajaxError
                });

                BS._fn.game.sizeX = data.width;
                BS._fn.game.sizeY = data.height;
                $('.body').append(BS._fn.game.drawBoard(0, 'Test Player'));
                BS._fn.events.attachResizeEvents();

            },

            events: {
                attachResizeEvents: function () {
                    $(document).off('click', '.playerContainer .badge').on('click', '.playerContainer .badge', function () {
                        var $board = $('ul.board'),
                            boardWidth = parseInt($board.attr('width')),
                            currentLiWidth = parseInt($board.find('li').first().css('width').slice(0, -2));
                        if ($(this).hasClass('smaller')) {
                            if (currentLiWidth < 10) {
                                console.log('The board piece cannot be smaller');
                            } else {
                                $board.find('li').css({width: (currentLiWidth - 5) + 'px', height: (currentLiWidth - 5) + 'px'});
                                $board.css('width', ((currentLiWidth - 5) * boardWidth + 1) + 'px');
                            }
                        } else {
                            console.log('Bigger');
                            $board.find('li').css({width: (currentLiWidth + 5) + 'px', height: (currentLiWidth + 5) + 'px'});
                            $board.css('width', ((currentLiWidth + 5) * boardWidth + 1) + 'px');
                        }
                    });
                }
            },


            game: {
                gameId : 0,
                interval : 300,
                currentUser : 0,
                currentShot : [0, 0],
                data: {},
                firstFinished : false,
                getData: function (gameId) {
                    console.log('Getting data');
                    this.gameId = gameId;
                    var that = this;
                    $.ajax({
                        url : '/game/' + gameId + '/stats',
                        cache : false,
                        success: function (data) {
                            console.log(data);
                            console.log('HERE');
                            that.data = data;
                            console.log(that.data);
                            that.sizeX = data.width;
                            that.sizeY = data.height;
                            that.numOfFields = that.sizeX * that.sizeY;
                            that.drawBoards();
                            $.each(data.boards, function (boardId) {
                                that.showNextShot(boardId);
                            });
                        },
                        error: BS._fn.common.ajaxError
                    });
                },

                pollNewShoots : function (boardId) {
                    var that = this;
                    $.ajax({
                        url : '/game/' + this.gameId + '/stats',
                        cache : false,
                        async: true,
                        success : function (data) {
                            if (!data.winner) {
                                data.boards[boardId].shoots.splice(data.boards[boardId].shoots.length - 1, 1);
                            }
                            that.data = data;
                            BS._fn.game.showNextShot(boardId);
                        },
                        error : BS._fn.common.ajaxError
                    }); 

                },

                showNextShot: function (boardId) {
                    if (this.data.boards[boardId].shoots[this.currentShot[boardId]]) {
                        var that = this;
                        this.shot(boardId, this.data.boards[boardId].shoots[this.currentShot[boardId]], this.currentShot[boardId] + 1);
                        this.currentShot[boardId] += 1;
                        $('#container' + boardId + ' span.shoots b').html(this.currentShot[boardId]);
                        var t = setTimeout(function () {
                            that.showNextShot(boardId);
                        }, that.interval);
                    } else if (!this.data.winner) {
                        console.log('Polling new shoots');
                        var t = setTimeout(function () {
                            BS._fn.game.pollNewShoots(boardId);
                        }, 2000);
                    } else {
                        if (this.firstFinished) {
                            console.log('Game finished. The winner is: ' + this.data.winner + '!');
                            if (this.data.winner == -1) {
                                $('.body').append('<div id="winner"><b class="winner">DRAW</b><br/>Both players scored <b>0</b> shoots</div>');
                            } else {
                                var players = this.data.players;
                                var loserId = players[0].id == this.data.winner ? players[1].id : players[0].id;
                                var winnerName = $('.playerContainer.player' + this.data.winner + ' .player-name').text();
                                var winnerScore = $('.playerContainer.player' + loserId + ' .shoots b').text();
                                var loserScore = $('.playerContainer.player' + this.data.winner + ' .shoots b').text();

                                $('.body').append('<div id="winner">And the winner is<br/><b class="winner">' + winnerName + '</b><br/> with <b class="win-shoots">' + winnerScore + '</b> shoots against <b class="lose-shoots">' + loserScore + '</b></div>');
                            }
                        } else {
                            console.log('First player finished shooting');
                            this.firstFinished = true;
                        }
                    }
                },

                drawBoard: function (id, name, playerId) {
                    var i = 0;
                    var j = 0;
                    var h = '<div class="playerContainer player' + playerId + '" id="container' + id + '"><span class="player-name">' + name + '</span><span class="badge bigger"><i class="glyphicon-plus"></i></span>/<span class="badge smaller"><i class="glyphicon-minus"></i></span><br/><span class="shoots">Shoots #<b>0</b></span><ul width="' + this.sizeX + '" style="width: ' + ((this.sizeX * 5) + 1) + 'px;" class="board" id="board' + id + '">';
                    for (i = 0; i < this.sizeY; i++) {
                        for (j = 0; j < this.sizeX; j++) {
                            h += '<li class="' + j + '-' + i + '" x="' + j + '" y="' + i + '"><div class="empty"></div></li>';
                        }
                    }
                    h += '</ul><div class="log"><h3>Game log</h3><ul id="log' + id + '"></ul></div></div>';
                    return h;
                },

                drawBoards: function () {
                    var that = this;
                    $.each(this.data.boards, function (index) {
                            $('.body').append(that.drawBoard(index, that.data.players[index].name, that.data.players[index].id));
                    });
                    $('.body').append('<div class="clear"></div>');
                    BS._fn.events.attachResizeEvents();
                },

                shot: function (id, data, num) {
                    console.log('Shotting x: ' + data.x + ', y: ' + data.y);
                    var elem = $('#board' + id + ' li.' + data.x + '-' + data.y);
                    var shotStatus = data.result;
                    $(elem).addClass(shotStatus);
                    console.log(shotStatus);

                    //Logging facility tuned off
//                    var html ='<li class="shotStatus ' + shotStatus + '">Shot ' + num + ' - x:' + data.x + ' y:' + data.y;
//                    switch(shotStatus){
//                        case 'miss' :
//                            html += ' - miss';
//                        break;
//                        case 'hit' :
//                            html += ' - hit ' + data.shipType + '!';
//                        break;
//                        case 'hitsunk' :
//                            html += ' - hit and sunk ' + data.shipType + '!!!';
//                        break;
//                        case 'samespot' :
//                            html += ' - hit spot that was hit before - BUUUUU!';
//                        break;
//                    } 
//                    html += '</li>';
//                    $('#log' + id).prepend(html);
                },

                displayGame: function (gameId) {
                    this.getData(gameId);
                }
            }
        },

        init: function () {
            $.cookie('token_test_player', this._vars.testToken);
            var that = this;
            $("#menuLogIn").click(function () {
                that._fn.common.logIn();
            });
            this._fn.showInitBox();
            this._fn.common.updateLoginUi();
        }
    };

    BS.init();
});

