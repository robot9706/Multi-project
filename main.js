var canvas;
var ctx;
var lastTime;

function start() {
    canvas = document.getElementById('game_canvas');
    ctx = canvas.getContext('2d');

    //Adatok feltöltése
    mapWidth = canvas.width / TILE_SIZE;
    mapHeight = canvas.height / TILE_SIZE;

    inputInit();

    gameInit();

    window.requestAnimationFrame(frame);
}

function frame(t) {
    if (lastTime == undefined) {
        lastTime = t;
    }
    var delta = (t - lastTime) / 1000.0;
    lastTime = t;

    window.requestAnimationFrame(frame);

    //Canvas ürítése
    ctx.fillStyle = "#333333";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    mapDraw(delta);
    playerDraw(delta);
}

//Bemenet kezelés
var input = {
    up: false, //38
    down: false, //40
    left: false, //37
    right: false //39
}
var inputMapping = {
    "38": "up",
    "40": "down",
    "37": "left",
    "39": "right"
}

function inputInit() {
    document.addEventListener('keydown', inputKeyDown, false);
    document.addEventListener('keyup', inputKeyUp, false);
}

function inputKeyDown(e) {
    var name = inputMapping[e.keyCode];

    if (name == undefined) {
        if (e.keyCode == 82) { //'R' gomb
            gameInit();
        } else {
            if (levelFinished) {
                if (playerDied) {
                    gameInit();
                } else {
                    gameNextMap();
                }
            }
        }

        return;
    }

    input[name] = true;
}

function inputKeyUp(e) {
    var name = inputMapping[e.keyCode];

    if (name == undefined) {
        return;
    }

    input[name] = false;
}

//Játék
var levelIndex = 6;

var levelTime = 0;
var levelFinished = false;
var playerDied = false;

function gameInit() {
    document.getElementById("text_nextlvl").style.visibility = "hidden";

    playerDied = false;
    levelFinished = false;
    levelTime = 0;

    map = jQuery.extend(true, {}, maps[levelIndex]);

    mapInit();

    //Pálya szöveg
    document.getElementById('text_level').innerHTML = (levelIndex + 1);
}

function gameNextMap() {
    if (levelIndex + 1 < maps.length) {
        levelIndex++;

        gameInit();
    }
}

//Pálya
var TILE_SIZE = 48;

var mapWidth;
var mapHeight;
var map;

var MAP_FINISH_ANIMATION_TIME = 1.0;
var mapFinishAnimationTime;

var mapLazerTiles = [ ];

function mapInit() {
    //Játékos elhelyezése
    var playerSpawn = map.spawn;
    playerPosition.x = playerSpawn.x;
    playerPosition.y = playerSpawn.y;

    playerTargetPosition = undefined;

    //Animáció újraindítása
    mapFinishAnimationTime = 0;
}

function mapDraw(t) {
    mapLazerTiles = [ ];

    //Négyzetek
    var tilemap = map.tiles;

    for (var ty = 0; ty < mapHeight; ty++) {
        var row = tilemap[ty];
        if (row == undefined) {
            continue;
        }

        for (var tx = 0; tx < mapWidth; tx++) {
            var tile = row[tx];
            if (tile == undefined) {
                continue;
            }

            if (tile === 0) { //Üres négyzet
                continue;
            }

            tileDraw(tile, tx, ty);
        }
    }

    //Vége négyzet
    var finishPos = map.finish;
    mapFinishAnimationTime += t;

    var finishAnim = (mapFinishAnimationTime / MAP_FINISH_ANIMATION_TIME) % 1.0;
    finishAnim = Math.sin(finishAnim * Math.PI);
    var finishColor = parseInt(finishAnim * 255);

    ctx.strokeStyle = "rgb(" + finishColor + ", " + finishColor + ", " + finishColor + ")";
    ctx.strokeRect(finishPos.x * TILE_SIZE + 1, finishPos.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);

    //Dobozok
    var entityList = map.entities;
    for (var i = 0; i < entityList.length; i++){
        entityDraw(entityList[i], t);
    }

    //Idő számláló
    if (!levelFinished) {
        levelTime += t;
    }

    var timeInt = parseInt(levelTime);
    var timeSec = timeInt % 60;
    var timeMin = Math.floor(timeInt / 60);

    document.getElementById('text_time').innerHTML = (timeMin < 10 ? "0" : "") + timeMin + ":" + (timeSec < 10 ? "0" : "") + timeSec;
}

function mapFindEntity(atX, atY) {
    var entityList = map.entities;
    for (var i = 0; i < entityList.length; i++){
        var entity = entityList[i];

        if (entity.x == atX && entity.y == atY) {
            return entity;
        }
    }

    return undefined;
}

function mapIsTileCollider(tx, ty, lazerMode) {
    var tilemap = map.tiles;
    var row = tilemap[ty];
    if (row == undefined) {
        return true;
    }

    var tile = row[tx];
    if (tile == undefined) {
        return true;
    }

    return tileIsCollider(tile, lazerMode);
}

function mapCollideAt(tx, ty, lazerMode) {
    if (mapIsTileCollider(tx, ty, lazerMode)) {
        return true;
    }

    return (mapFindEntity(tx, ty) != null);
}

//Entities
function entityCanMove(entity, dir) {
    if (entity.type != 0) {
        return false;
    }

    return !mapCollideAt(entity.x + dir.x, entity.y + dir.y);
}

function entityDoMove(entity, dir) {
    entity.anim = animCreate(entity.x, entity.y, entity.x + dir.x, entity.y + dir.y, PLAYER_MOVE_TIME - 0.001);
}

function entityDraw(entity, t) {
    var drawX = entity.x;
    var drawY = entity.y;

    if (entity.anim != undefined) {
        var animResult = animUpdate(t, entity.anim);
        if (animResult === true) {
            entity.x = entity.anim.to.x;
            entity.y = entity.anim.to.y;

            entity.anim = undefined;

            drawX = entity.x;
            drawY = entity.y;
        } else {
            drawX = animResult.x;
            drawY = animResult.y;
        }
    }

    switch (entity.type) {
        case 0: //Doboz
            ctx.fillStyle = "#aaaaaa";
            ctx.fillRect(drawX * TILE_SIZE, drawY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            break;
        case 1: //Lazer
            ctx.fillStyle = "#ff0000";
            ctx.fillRect(drawX * TILE_SIZE + 10, drawY * TILE_SIZE + 10, TILE_SIZE - 20, TILE_SIZE - 20);

            entityDrawlazer(drawX, drawY, entity.lazerDir.x, entity.lazerDir.y);
            break;
    }
}

function entityDrawlazer(tx, ty, lazerX, lazerY) {
    for (var step = 0; step < 10; step++) {
        var checkX = tx + lazerX * step;
        var checkY = ty + lazerY * step;

        if (step != 0 && mapCollideAt(checkX, checkY, true)) {
            break;
        }

        mapLazerTiles.push({
            x: checkX,
            y: checkY
        })

        ctx.fillStyle = "#ff0000";
        if (step == 0) {
            if (lazerX != 0) {
                ctx.fillRect(checkX * TILE_SIZE + (TILE_SIZE / 2) * (lazerX > 0 ? 1 : 0), checkY * TILE_SIZE + (TILE_SIZE / 2) - 5, TILE_SIZE / 2, 10);
            } else {
                ctx.fillRect(checkX * TILE_SIZE + (TILE_SIZE / 2) - 5, checkY * TILE_SIZE + (TILE_SIZE / 2) * (lazerY > 0 ? 1 : 0), 10, TILE_SIZE / 2);
            }
        } else {
            if (lazerX != 0) {
                ctx.fillRect(checkX * TILE_SIZE, checkY * TILE_SIZE + (TILE_SIZE / 2) - 5, TILE_SIZE, 10);
            } else {
                ctx.fillRect(checkX * TILE_SIZE + (TILE_SIZE / 2) - 5, checkY * TILE_SIZE, 10, TILE_SIZE);
            }
        }
    }
}

//Négyzetek
function tileDraw(type, tx, ty) {
    var x = tx * TILE_SIZE;
    var y = ty * TILE_SIZE;

    switch(type) {
        case 1: //Út
        ctx.fillStyle = "#444444";
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        ctx.fillStyle = "#666666";
        ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        break;
        case 2: //Átlátszó fal - X
        tileDraw(1, tx, ty);

        ctx.fillStyle = "#222222";
        ctx.fillRect(x, y + (TILE_SIZE / 2) - 5, TILE_SIZE, 10);
        break;
        case 3: //Átlátszó fal - Y
        tileDraw(1, tx, ty);

        ctx.fillStyle = "#222222";
        ctx.fillRect(x + (TILE_SIZE / 2) - 5, y, 10, TILE_SIZE);
        break;
    }
}

function tileIsCollider(type, lazerMode) {
    if (lazerMode) {
        if (type == 2 || type == 3) {
            return false;
        }
    }

    return (type != 1);
}

//Játékos
var PLAYER_MOVE_TIME = 0.1;

var playerPosition = {
    x: undefined,
    y: undefined
}
var playerMove = undefined;

function playerDraw(t) {
    var drawPosition = playerPosition;

    //Bemenet
    if (playerMove == undefined && !levelFinished) {
        if (input.up && !mapIsTileCollider(playerPosition.x, playerPosition.y - 1)) {
            playerMove = animCreate(playerPosition.x, playerPosition.y, playerPosition.x, playerPosition.y - 1, PLAYER_MOVE_TIME);
        } else if (input.down && !mapIsTileCollider(playerPosition.x, playerPosition.y + 1)) {
            playerMove = animCreate(playerPosition.x, playerPosition.y, playerPosition.x, playerPosition.y + 1, PLAYER_MOVE_TIME);
        } else if (input.left && !mapIsTileCollider(playerPosition.x - 1, playerPosition.y)) {
            playerMove = animCreate(playerPosition.x, playerPosition.y, playerPosition.x - 1, playerPosition.y, PLAYER_MOVE_TIME);
        } else if (input.right && !mapIsTileCollider(playerPosition.x + 1, playerPosition.y)) {
            playerMove = animCreate(playerPosition.x, playerPosition.y, playerPosition.x + 1, playerPosition.y, PLAYER_MOVE_TIME);
        }

        if (playerMove != undefined) {
            var entity = mapFindEntity(playerMove.to.x, playerMove.to.y);
            if (entity != undefined) {
                var dir = animDir(playerMove);
                if (entityCanMove(entity, dir)) {
                    entityDoMove(entity, dir);
                } else {
                    playerMove = undefined;
                }
            }
        }
    }

    //Animáció
    if (playerMove != undefined) {
        var anim = animUpdate(t, playerMove);

        if (anim === true) {
            playerPosition.x = playerMove.to.x;
            playerPosition.y = playerMove.to.y;

            playerMove = undefined;

            eventPlayerMoved(playerPosition.x, playerPosition.y);
        } else {
            drawPosition = anim;
        }
    }

    //Rajzolás
    ctx.fillStyle = (playerDied ? "#ff0000" : "#ffffff");
    ctx.fillRect(drawPosition.x * TILE_SIZE, drawPosition.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
}

function playerCheckLazer() {
    for (var x = 0; x < mapLazerTiles.length; x++) {
        if (mapLazerTiles[x].x == playerPosition.x && mapLazerTiles[x].y == playerPosition.y) {
            levelFinished = true;
            playerDied = true;
        }
    }
}

//Mozgás animáció
function animCreate(fromX, fromY, toX, toY, time) {
    return {
        from: {
            x: fromX,
            y: fromY
        },
        to: {
            x: toX,
            y: toY
        },
        time: 0,
        maxTime: time
    };
}

function animUpdate(time, anim) {
    anim.time += time;

    var moveProgress = anim.time / anim.maxTime;

    if (moveProgress >= 1) {
        return true;
    } else {
        var difX = anim.to.x - anim.from.x;
        var difY = anim.to.y - anim.from.y;

        return {
            x: anim.from.x + difX * moveProgress,
            y: anim.from.y + difY * moveProgress
        };
    }
}

function animDir(anim) {
    return {
        x: Math.sign(anim.to.x - anim.from.x),
        y: Math.sign(anim.to.y - anim.from.y),
    }
}

function eventPlayerMoved(toX, toY) {
    if (toX == map.finish.x && toY == map.finish.y) {
        levelFinished = true;

        document.getElementById("text_nextlvl").style.visibility = "visible";
    } else {
        playerCheckLazer();
    }
}