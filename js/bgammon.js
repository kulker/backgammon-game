/*
 * HTML 5 Game - Backgammon 
 * http://www.kurtulusulker.com.tr
 * Copyright (C) 2016 by Kurtulus Ulker , kurtulus.ulker@gmail.com
 */
var BGHConf = {
    boardWidth: 950,
    boardHeight: 746,
    piece: 50,
    bgImg: 'assets/tavla_zemin.png',
    piecePrime: 'assets/tas_beyaz60.png',
    pieceSecond: 'assets/tas_koyumavi60.png',
    slotFirst: {x: 850, y: 28},
    slotWidth: 52,
    slotMaxPiece: 6,
    boardMiddleSpaceWidthX: 115,
    boardMiddleSpaceWidthY: 94,
    breakZoneCoord: {prime: {x: 425, y: 50}, second: {x: 480, y: 410}},
    userPicesCount:15,
    dice: {
        bgImg: 'assets/blank-dice-th.png',
        width: 50,
        height: 50
    },
    pipPoint:{
        width:150,
        fontSize:21,
        x:825,
        y:348,
        fontColor:'white',
        fontFamily:'Calibri'
    },
    aggregationZone:{ //toplama alanı
        prime:{
            x:873,
            y:23,
            width:155,
            height:320
        },
        slave:{
            x:873,
            y:395,
            width:155,
            height:330
        },
        addStep:20
    }
    
}

var BGH = {};
var BGHSlots = [];
var BGHSlotCounter = [];
var BGHSlotOwner = [];
var BGHSlotCoord = [];
var lastMovePiece = {grp: null, piece: null, slotNo: -1};
var BGHUserPiece = 'p';
var BGHUserOrder = 'p';
var BGHuserBreakCnt = [];
var BGHSlotCustomPieceSize = [];

function init() {
    reset();
    initBoard();
    initPieces();
    drawBGH();
}
var DEBUG_MOD=false; //!!!!!!!!!!!!!!!!!!!! bu değişken ve kullanımı production da kaldırılacak!!!!!!!!!!!!!1111 

var diceLayer = null;
var diceLayerTwo = null;
var slotHighlightLayer = null;
var pipPointTextPrime,pipPointTextSlave=null;


var number2pointMap = {
    1: ['point_7'], 2: ['point_4', 'point_3'],
    3: ['point_7', 'point_4', 'point_3'], 4: ['point_1', 'point_3', 'point_4', 'point_6'],
    5: ['point_1', 'point_3', 'point_4', 'point_6', 'point_7'], 6: ['point_1', 'point_2', 'point_3', 'point_4', 'point_5', 'point_6']
};


var BGHAggZone={
   primeTotal:0,
   slaveTotal:0,
   checkUserAggStatus:function (primeOrSecond) {
      
        var succCnt=0;
          function calcPoint(objPiece){             
                  if (objPiece.primeOrSecond==primeOrSecond && objPiece.status!='B' ) {
                            if (primeOrSecond=='p' && ( objPiece.status=='F' || (objPiece.slotNo>=18 && objPiece.slotNo<24)) ) succCnt++;
                            if (primeOrSecond=='s' && ( objPiece.status=='F' || (objPiece.slotNo>=0 && objPiece.slotNo<6))) succCnt++;
                    } 
        }    
    boardPices.forEach(calcPoint);       
        return  (succCnt>0 && BGHConf.userPicesCount==succCnt);
   },
   isAggZone:function (pieceX,pieceY,primeOrSecond) {
    //   BGHConf.aggregationZone
  /*  buara kladın,
           
            büyük zarda toplama kontrolüde eklenecek ör: 6-5 de 6 e 5 de pul yoksa dörtü topla 
                */
            
    pieceX = pieceX + ((BGHConf.slotWidth * 40) / 100);
    pieceY = pieceY + ((BGHConf.slotWidth * 30) / 100);
    
     var checkZone=(primeOrSecond=='p') ?  BGHConf.aggregationZone.slave:BGHConf.aggregationZone.prime;
       return (  pieceX>=checkZone.x && pieceX<=( checkZone.x+checkZone.width) && pieceY>=checkZone.y && pieceY<=(checkZone.y+checkZone.height));
   },
   movePieceAggZone:function (pieceGrp) {
  
    var piece=pieceGrp.attrs.piece;   
       
    var _slotNo = piece.slotNo;
    if (piece.primeOrSecond == BGHUserPiece) {
        lastMovePiece.piece = piece;
        lastMovePiece.grp = pieceGrp;
        lastMovePiece.slotNo = piece.slotNo;
    }

    removePiece2Slot(piece.slotNo, piece.index);
    
    var checkZone=(piece.primeOrSecond=='p') ?  BGHConf.aggregationZone.slave:BGHConf.aggregationZone.prime;
    var aggZoneIndex=(piece.primeOrSecond=='p') ? this.primeTotal:this.slaveTotal;
     
    piece.status='F';
    piece.slotNo=-2;
    
    pieceGrp.attrs.piece = piece;
    BGHUserRolledDice.setMovePice();
     var coord={ x:checkZone.x, y:checkZone.y + (aggZoneIndex*BGHConf.aggregationZone.addStep)  };
     
     pieceGrp.setPosition({x: coord.x, y: coord.y});
     pieceGrp.setDraggable(false);
     pieceGrp.setZIndex(100+aggZoneIndex);
       if (pieceGrp.children[0] instanceof Kinetic.Image) {
           //pieceGrp.children[0].setHeight(BGHConf.aggregationZone.addStep+1);
           pieceGrp.children[0].setZIndex(100+aggZoneIndex);
       }
                
         
     
     BGH.board.draw();  
     if (piece.primeOrSecond=='p') this.primeTotal++; else this.slaveTotal++;
    fixSlotArea(_slotNo);
    
    if (BGHUserRolledDice.checkNextUserOrder()) {
        toggleUserOrder();
    }
        
   //..
        calcAndShowPipPoint();
    }   
}
var BGHUserRolledDice = {one: null, _two: null, totalMovePieceCount: 0,
    remainPieces: [],
    curentRemainPieceIndex: 1,
    moveSlotNo: null,
    checkMovePice: function (slotNo,isAggZone) {
        for (var c = 1; c < (this.totalMovePieceCount + 1); c++) {
            if (this.remainPieces[c] == slotNo)
                return true;
        }
        if (isAggZone===true) return false;

        if (this.totalMovePieceCount == 2 && this.remainPieces[1] != -1 && this.remainPieces[2] != -1 && (this.remainPieces[2] + this.remainPieces[1]) == slotNo)
            return true;

        if (this.totalMovePieceCount == 4) {
            //çiftse 
            var stepCnt = 0;
            if ( (this.totalMovePieceCount-this.curentRemainPieceIndex) >= 1 && (this.one * 2) == slotNo)
                stepCnt = 2;
            if (stepCnt == 0 && (this.totalMovePieceCount-this.curentRemainPieceIndex) >= 2 && (this.one * 3) == slotNo)
                stepCnt = 3;
            if (stepCnt == 0 && (this.totalMovePieceCount-this.curentRemainPieceIndex) == 3 && (this.one * 4) == slotNo)
                stepCnt = 4;
           
            
            if (stepCnt > 0) {
                var remainCnt = 0;
                for (var c = 1; c < (this.totalMovePieceCount + 1); c++) {
                    if (this.remainPieces[c] !== -1)
                        remainCnt++;
                }
                console.debug('checkMovePice',stepCnt,remainCnt);
                if (remainCnt>=stepCnt)
                    return true;
            }
        }

        return false;
    },
    setMovePice: function () {
        if (null == this.moveSlotNo)
            return false;
        var slotNo = this.moveSlotNo;
        if (this.totalMovePieceCount === 4) {
            switch (this.curentRemainPieceIndex) {
                case 1:
                    setDiceOrder(this.curentRemainPieceIndex, 'top', true);
                    break;
                case 2:
                    setDiceOrder(1, 'all', true);
                    break;
                case 3:
                    setDiceOrder(2, 'top', true);
                    break;
                case 4:
                    setDiceOrder(2, 'all', true);
                    break;
            }

        } else {
            setDiceOrder((this.remainPieces[1] == slotNo) ? 1 : 2, 'all', true);
        }

         this.curentRemainPieceIndex++;
        for (var c = 1; c < (this.totalMovePieceCount + 1); c++) {
            if (this.remainPieces[c] == slotNo) {
                this.remainPieces[c] = -1;
               
                return true;
            }
        }

        if (this.totalMovePieceCount == 2 && this.remainPieces[1] != -1 && this.remainPieces[2] != -1 && (this.remainPieces[2] + this.remainPieces[1]) == slotNo) {
            this.remainPieces[1] = -1;
            this.remainPieces[2] = -1;
            setDiceOrder(1, 'all', true);
            setDiceOrder(2, 'all', true);
            this.curentRemainPieceIndex ++;
            return true;
        }

        if (this.totalMovePieceCount == 4) {
            //çiftse 
          var stepCnt = 0;
          var getScnt=this.getSetPieceCnt(); 
          
            if ( getScnt > 1 && (this.one * 2) == slotNo)
                stepCnt = 2;
            if (stepCnt == 0 && getScnt> 2 && (this.one * 3) == slotNo)
                stepCnt = 3;
            if (stepCnt == 0 && getScnt>3 && (this.one * 4) == slotNo)
                stepCnt = 4;
           
            if (stepCnt > 0) {
                var setCnt = 0;
                for (var c = 1; c < (this.totalMovePieceCount + 1); c++) {
                    if (this.remainPieces[c] !== -1 && setCnt < stepCnt) {
                        this.remainPieces[c] = -1;                        
                        setCnt++;
                    }
                }
                
                  switch (this.getSetPieceCnt()) {
                        case 2:
                            setDiceOrder(1, 'all', true);
                            setDiceOrder(2, 'all', false);
                            break;
                        case 1:
                            setDiceOrder(1, 'all', true);
                            setDiceOrder(2, 'top', true);
                            break;
                        default:    
                        case 0:
                            setDiceOrder(1, 'all', true);
                            setDiceOrder(2, 'all', true);
                    break;
                 
            }
                
                 console.debug('setMovePice:',stepCnt,setCnt);
                 this.curentRemainPieceIndex+=stepCnt-1;
                return true;
            }
        }

        return false;
    },
    getSetPieceCnt: function(){
        var ret=0;
              for (var c = 1; c < (this.totalMovePieceCount + 1); c++) {
                    if (this.remainPieces[c] !== -1) {
                        ret++;
                    }
               }
               return ret;
    }
    ,
    checkNextUserOrder: function () {
        return (this.curentRemainPieceIndex == this.totalMovePieceCount + 1) ? true : false;
    },
    undoMovePice: function (slotNo) {
        this.curentRemainPieceIndex--;
        //TODO  setDiceOrder tersi
        for (var c = 1; c < (this.totalMovePieceCount + 1); c++) {
            if (this.remainPieces[c] === -1) {
                this.remainPieces[c] = slotNo;
                return true;
            }
        }
        return false;
    },
    _checkSlot:function (slotNo,primeOrSecond){
        return ((BGHSlotOwner[slotNo] == null || BGHSlotOwner[slotNo] == primeOrSecond) || BGHSlotCounter[slotNo] == 1);
    }
     ,
    _checkAndHighlightSlotOn: function (alternateSlotNo, dragPice, alternateSlotNo2) {

        var chkOne = true;
        if (typeof alternateSlotNo2 !== 'undefined' && alternateSlotNo2 !== -1) {
            console.log('alternateSlotNo2', alternateSlotNo2);
            chkOne = this._checkSlot(alternateSlotNo2,dragPice.primeOrSecond);
        }
        if (chkOne && ( this._checkSlot(alternateSlotNo,dragPice.primeOrSecond) )) {
            setSlotHighligtVisibility(alternateSlotNo, true);
        }
    }
    ,
    highlightSlotOn: function (dragPice/*SlotNo*/) {
        if (this.totalMovePieceCount > 0 && this.curentRemainPieceIndex <= this.totalMovePieceCount) {

            this.highlightSlotOff();


            if (dragPice.status === 'B') {
                /*
                 && piece.primeOrSecond==BGHUserPiece && [0,1,2,3,4,5].indexOf(dragslotNo)!=-1 ) ||
                 (piece.status=='B' && piece.primeOrSecond!=BGHUserPiece && [23,22,21,20,19,18].indexOf(dragslotNo)!=-1)
                 */

                if (this.totalMovePieceCount === 2) {


                    if (this.remainPieces[1] !== -1) {
                        if (dragPice.primeOrSecond == BGHUserPiece) {
                            this._checkAndHighlightSlotOn((this.one - 1), dragPice);
                        } else {
                            this._checkAndHighlightSlotOn((24 - this.one), dragPice);
                        }

                    }

                    if (this.remainPieces[2] != -1) {
                        if (dragPice.primeOrSecond == BGHUserPiece) {
                            this._checkAndHighlightSlotOn((this.two - 1), dragPice);
                        } else {
                            this._checkAndHighlightSlotOn((24 - this.two), dragPice);
                        }

                    }

                } else {
                    // cift gelmisse


                    if (dragPice.primeOrSecond === BGHUserPiece) {
                        this._checkAndHighlightSlotOn((this.two - 1), dragPice);
                    } else {
                        this._checkAndHighlightSlotOn((24 - this.two), dragPice);
                    }
                }


            } else {
                //normal taş ise
                if (this.totalMovePieceCount === 2) {

                    if (this.remainPieces[1] !== -1 && this.remainPieces[2] !== -1) {
                        if (BGHUserPiece === dragPice.primeOrSecond) {
                            //sağdan sola
                            this._checkAndHighlightSlotOn((dragPice.slotNo + this.one), dragPice);
                            this._checkAndHighlightSlotOn((dragPice.slotNo + this.two), dragPice);
                            this._checkAndHighlightSlotOn((dragPice.slotNo + this.one + this.two), dragPice, (dragPice.slotNo + this.one));

                        } else {
                            //soldan sağa
                            this._checkAndHighlightSlotOn((dragPice.slotNo - this.one), dragPice);
                            this._checkAndHighlightSlotOn((dragPice.slotNo - this.two), dragPice);
                            this._checkAndHighlightSlotOn((dragPice.slotNo - (this.one + this.two)), dragPice, (dragPice.slotNo - this.one));
                        }
                    } else {
                        if (this.remainPieces[1] !== -1) {
                            if (BGHUserPiece === dragPice.primeOrSecond) {
                                this._checkAndHighlightSlotOn((dragPice.slotNo + this.one), dragPice);
                            } else {
                                this._checkAndHighlightSlotOn((dragPice.slotNo - this.one), dragPice);
                            }
                        }

                        if (this.remainPieces[2] !== -1) {
                            if (BGHUserPiece === dragPice.primeOrSecond) {
                                this._checkAndHighlightSlotOn((dragPice.slotNo + this.two), dragPice);
                            } else {
                                this._checkAndHighlightSlotOn((dragPice.slotNo - this.two), dragPice);
                            }
                        }
                    }


                } else {
                    //çift gelmişse

                    //sağdan sola
                    for (var r = 1; r < (this.totalMovePieceCount - this.curentRemainPieceIndex) + 2; r++) {
                        if (BGHUserPiece === dragPice.primeOrSecond)
                            this._checkAndHighlightSlotOn((dragPice.slotNo + (this.one * r)), dragPice, (r > 1) ? (dragPice.slotNo + (this.one * (r - 1))) : -1);
                        else
                            this._checkAndHighlightSlotOn((dragPice.slotNo - (this.one * r)), dragPice, (r > 1) ? (dragPice.slotNo - (this.one * (r - 1))) : -1);
                    }


                }
            }

            slotHighlightLayer.draw();
        }
    },
    highlightSlotOff: function () {
        //TODO highlight layer hide
        //  slotHighlightLayer.hide();
        for (var i = 0; i < 24; i++) {
            setSlotHighligtVisibility(i, false);
        }
        slotHighlightLayer.draw();

    }

    ,
    set two(x) {
        this._two = x;
        if (this.one != null) {
            this.totalMovePieceCount = (this.one == this._two) ? 4 : 2;
            this.curentRemainPieceIndex = 1;
            this.moveSlotNo = null;
            if (this.one == this._two) {
                for (var r = 0; r < 4; r++)
                    this.remainPieces[r + 1] = this.one;
            } else {
                this.remainPieces[1] = this.one;
                this.remainPieces[2] = this._two;
            }
        }
    },
    get two() {
        return this._two;
    }
};
var randArr = [];
var animDice = null;
var diceRandIndex = 0;
var boardPices=[];
 


function rollDice(number1, number2) {
    var isRand = false;
    if (!number1 || !number2)
        isRand = true;

    if (!isRand && (number1 < 1 || number1 > 6 || number2 < 1 || number2 > 6))
        isRand = true;

    randArr = [];
    diceRandIndex = 0;


    var randomTry = Math.floor(5 * Math.random()) + 1;
    randomTry += 3;

    var i = 0;
    var randomDice_1 = 0;
    var randomDice_2 = 0;

    while (i < randomTry) {

        randomDice_1 = Math.floor(6 * Math.random()) + 1;
        randomDice_2 = Math.floor(6 * Math.random()) + 1;

        if (randArr.indexOf(randomDice_1 + '_' + randomDice_2) == -1) {
            randArr.push(randomDice_1 + '_' + randomDice_2);
            i++;
        }
    }

    if (!isRand) {
        randArr.push(number1 + '_' + number2);
    } else {
        number1 = randomDice_1;
        number2 = randomDice_2;
    }

    BGHUserRolledDice.one = number1;
    BGHUserRolledDice.two = number2;



    if (number1 < number2) {
        BGHUserRolledDice.one = number2;
        BGHUserRolledDice.two = number1;
    }

   // console.log(randArr, BGHUserRolledDice);

    rollDiceAnimate();
}


function rollDiceAnimate() {
    if (randArr.length > 0) {

        var tmpNum = randArr[diceRandIndex].split('_');
        drawDice(tmpNum[0], tmpNum[1]);

        if (diceRandIndex < randArr.length - 1) {
            diceRandIndex++;
            setTimeout(rollDiceAnimate, 200);
        } else {
            drawDice(BGHUserRolledDice.one, BGHUserRolledDice.two);
            checkBypassing();
        }

    }
}

function drawDice(numberOne, numberTwo) {
    if (numberOne < numberTwo) {
        var tmp = numberOne;
        numberOne = numberTwo;
        numberTwo = tmp;
    }

    if (diceLayer !== null) {
        var diceGrpOne = diceLayer.get('#diceOne')[0];
        var diceGrpTwo = diceLayer.get('#diceTwo')[0];
        // console.log(diceGrpOne,diceGrpTwo);
        setDiceOrder(1, 'all', false);
        setDiceOrder(2, 'all', false);
        var n = diceGrpOne.children.length;
        for (var i = 0; i < n; i++) {
            if (diceGrpOne.children[i] instanceof Kinetic.Circle) {
                var pId = diceGrpOne.children[i].getId();
                if (number2pointMap[numberOne].indexOf(pId) !== -1)
                    diceGrpOne.children[i].show();
                else
                    diceGrpOne.children[i].hide();
            }

            if (diceGrpTwo.children[i] instanceof Kinetic.Circle) {
                var pId = diceGrpTwo.children[i].getId();
                if (number2pointMap[numberTwo].indexOf(pId) !== -1)
                    diceGrpTwo.children[i].show();
                else
                    diceGrpTwo.children[i].hide();
            }
        }

        diceLayer.show();
        diceGrpOne.show();
        diceGrpTwo.show();
        diceLayer.draw();
        //sayıGoster
    }


}


function setDiceOrder(number, dicePart, isShow) {
    if (diceLayer != null) {

        if (number == 1) {
            var diceFloorOne = diceFloorParts.one.dice_floor1_1;
            var diceFloorTwo = diceFloorParts.one.dice_floor1_2;
        } else {
            var diceFloorOne = diceFloorParts.two.dice_floor1_1;
            var diceFloorTwo = diceFloorParts.two.dice_floor1_2;
        }
        //  console.log(number,diceFloorOne,diceFloorTwo);

        switch (dicePart) {
            case 'all':
                if (isShow)
                    diceFloorOne.show();
                else
                    diceFloorOne.hide();
                if (isShow)
                    diceFloorTwo.show();
                else
                    diceFloorTwo.hide();
                break;
            case 'top':
                if (isShow)
                    diceFloorOne.show();
                else
                    diceFloorOne.hide();
                diceFloorTwo.hide();
                break;
        }
        diceLayer.draw();

    }
}




function reset() {
    BGHuserBreakCnt['p'] = 0;
    BGHuserBreakCnt['s'] = 0;
    
    BGHAggZone.primeTotal=0;
    BGHAggZone.slaveTotal=0;
    
    for (var i = 0; i < 24; i++) {
        BGHSlotCounter[i] = 0;
        BGHSlotOwner[i] = null;
        BGHSlots[i] = [];
        BGHSlotCustomPieceSize[i] = BGHConf.piece;
        if (i < 6) {
            var slotX = BGHConf.slotFirst.x - ((i + 1) * BGHConf.slotWidth);
            var slotY = BGHConf.slotFirst.y;
            BGHSlotCoord[i] = {
                x: slotX,
                y: slotY,
                x2: slotX + BGHConf.slotWidth,
                y2: slotY + (BGHConf.piece * BGHConf.slotMaxPiece),
                n: i
            };
        }

        if (i >= 6 && i < 12) {
            var slotX = BGHConf.slotFirst.x - (BGHConf.boardMiddleSpaceWidthX + ((i + 1) * BGHConf.slotWidth));
            var slotY = BGHConf.slotFirst.y;

            BGHSlotCoord[i] = {
                x: slotX,
                y: slotY,
                x2: slotX + BGHConf.slotWidth,
                y2: slotY + (BGHConf.piece * BGHConf.slotMaxPiece),
                n: i
            };
        }


        if (i >= 12 && i < 18) {
            var slotX = (BGHConf.slotFirst.x - (BGHConf.boardMiddleSpaceWidthX + ((12 * BGHConf.slotWidth)))) + ((i - 12) * BGHConf.slotWidth);
            var slotY = BGHConf.slotFirst.y + (BGHConf.piece * BGHConf.slotMaxPiece) + BGHConf.boardMiddleSpaceWidthY;

            BGHSlotCoord[i] = {
                x: slotX,
                y: slotY,
                x2: slotX + BGHConf.slotWidth,
                y2: slotY + (BGHConf.piece * BGHConf.slotMaxPiece),
                n: i
            };
        }

        if (i >= 18) {
            var slotX = (BGHConf.slotFirst.x - (BGHConf.boardMiddleSpaceWidthX + ((12 * BGHConf.slotWidth)))) + BGHConf.boardMiddleSpaceWidthX + ((i - 12) * BGHConf.slotWidth)
            var slotY = BGHConf.slotFirst.y + (BGHConf.piece * BGHConf.slotMaxPiece) + BGHConf.boardMiddleSpaceWidthY;

            BGHSlotCoord[i] = {
                x: slotX,
                y: slotY,
                x2: slotX + BGHConf.slotWidth,
                y2: slotY + (BGHConf.piece * BGHConf.slotMaxPiece),
                n: i
            };
        }
    }
}


function testSlotArea() {
    for (var i = 0; i < 24; i++) {
        var group = new Kinetic.Group({
            x: BGHSlotCoord[i].x,
            y: BGHSlotCoord[i].y,
            width: BGHSlotCoord[i].x2 - BGHSlotCoord[i].x,
            height: BGHSlotCoord[i].y2 - BGHSlotCoord[i].y,
            id: 'testLayer' + i,
            draggable: true
        });
        
         
        
        var rectangle = new Kinetic.Rect({
            x: 0,
            y: 0,
            width: BGHSlotCoord[i].x2 - BGHSlotCoord[i].x,
            height: BGHSlotCoord[i].y2 - BGHSlotCoord[i].y,
            opacity: 0.5,
            fill: (i % 2 == 0) ? 'yellow' : 'red',
            stroke: "black",
            strokeWidth: 1
        });
        console.log(BGHSlotCoord[i].x2 - BGHSlotCoord[i].x);
        var rectangleText = new Kinetic.Text({
            x: 0,
            y: 0,
            text: '' + i + ',' + BGHSlotCounter[i] + ',' + BGHSlotOwner[i],
            fontSize: 13,
            fontFamily: 'Arial',
            textFill: 'white',
            fill: 'white'
        });
        group.add(rectangle);
        group.add(rectangleText);
        group.on('dragend', function (e) {
            this.destroy();
        });

        BGH.layer.add(group);
    }
    
    
    var group = new Kinetic.Group({
            x: BGHConf.aggregationZone.prime.x,
            y: BGHConf.aggregationZone.prime.y,
            width: BGHConf.aggregationZone.prime.width,
            height: BGHConf.aggregationZone.prime.height,
            id: 'testLayer' + 25,
            draggable: true
        });
        var rectangle = new Kinetic.Rect({
            x: 0,
            y: 0,
            width: BGHConf.aggregationZone.prime.width,
            height: BGHConf.aggregationZone.prime.height,
            opacity: 0.5,
            fill: 'green',
            stroke: "black",
            strokeWidth: 1
        });
       
        var rectangleText = new Kinetic.Text({
            x: 0,
            y: 0,
            text: 'prime -Adt:'+BGHAggZone.primeTotal ,
            fontSize: 13,
            fontFamily: 'Arial',
            textFill: 'white',
            fill: 'white'
           
        });
        group.add(rectangle);
        group.add(rectangleText);
        group.on('dragend', function (e) {
            this.destroy();
        });
   BGH.layer.add(group);
   var group2 = new Kinetic.Group({
            x: BGHConf.aggregationZone.slave.x,
            y: BGHConf.aggregationZone.slave.y,
            width: BGHConf.aggregationZone.slave.width,
            height: BGHConf.aggregationZone.slave.height,
            id: 'testLayer' + 25,
            draggable: true
        });
        
          rectangle = new Kinetic.Rect({
            x: 0,
            y: 0,
            width: BGHConf.aggregationZone.slave.width,
            height: BGHConf.aggregationZone.slave.height,
            opacity: 0.5,
            fill: 'green',
            stroke: "black",
            strokeWidth: 1
        });
       
          rectangleText = new Kinetic.Text({
            x: 0,
            y: 0,
            text: 'slave -Adt:'+BGHAggZone.slaveTotal ,
            fontSize: 13,
            fontFamily: 'Arial',
            textFill: 'white',
            fill: 'white'
        });
        group2.add(rectangle);
        group2.add(rectangleText);
        group2.on('dragend', function (e) {
            this.destroy();
        });

        BGH.layer.add(group2);
    BGH.layer.draw();
}

function setPieceDraggable(pieceType, active, pieceStatus) {
    var n = BGH.layer.children.length;

    if (n > 0) {
        for (var i = 0; i < n; i++) {
            if (BGH.layer.children[i].hasOwnProperty('attrs') && BGH.layer.children[i].attrs.hasOwnProperty('piece')) {
                var p = BGH.layer.children[i].attrs.piece;
                //console.log(p);
                if (p.primeOrSecond == pieceType &&
                        (typeof pieceStatus == 'undefined' || pieceStatus == '' || p.status == pieceStatus)) {
                    BGH.layer.children[i].setDraggable((active) ? true : false);
                }
            }
        }
        BGH.board.draw();
    }
}


function loadImages() {

    var bimg = new Image();
    bimg.src = BGHConf.bgImg;
    bimg.onload = function () {
        BGHConf.bgImg = this;
    }


    var prime = new Image();
    prime.src = BGHConf.piecePrime;
    prime.onload = function () {
        BGHConf.piecePrime = this;
    }

    var prime = new Image();
    prime.src = BGHConf.pieceSecond;
    prime.onload = function () {
        BGHConf.pieceSecond = this;
    }


    var diceI = new Image();
    diceI.src = BGHConf.dice.bgImg;
    diceI.onload = function () {
        BGHConf.dice.bgImg = this;
    }
}

function calcPieceCoord(piece, pieceSize) {
    if (typeof pieceSize == 'undefined')
        pieceSize = BGHConf.piece;
    /*  console.log('calc pieceSize', pieceSize, 'y,y2:', BGHSlotCoord[piece.slotNo].y, BGHSlotCoord[piece.slotNo].y2);
     console.log('calc piece', piece.index, ' y:', BGHSlotCoord[piece.slotNo].y2 - (pieceSize * (piece.index)));
     */
    if (piece.slotNo < 12) {
        return {
            x: BGHSlotCoord[piece.slotNo].x,
            y: BGHSlotCoord[piece.slotNo].y + (pieceSize * (piece.index - 1))
        }
    } else {
        return {
            x: BGHSlotCoord[piece.slotNo].x,
            y: BGHSlotCoord[piece.slotNo].y2 - (pieceSize * (piece.index))
        }
    }

}
function addPiece(isPrime, slotNo) {
    BGHSlotCounter[slotNo]++;
    BGHSlotOwner[slotNo] = (isPrime) ? 'p' : 's';

    var piece = {
        primeOrSecond: (isPrime) ? 'p' : 's',
        slotNo: slotNo,
        index: BGHSlotCounter[slotNo],
        status: 'N' /*  N:Normal, B: Kırık, F:toplama alanında  */
    };

    var coord = calcPieceCoord(piece);
    var pieceGroup = new Kinetic.Group({
        x: coord.x,
        y: coord.y,
        draggable: false, //TODO eğer oyuncunun taşları değilse false olacak!!!!!!!!!!!!!!!!!
        piece: piece,
        drgBefore: {
            x: coord.x,
            y: coord.y
        },
        id: 'piece_' + slotNo + '_' + piece.index
    });

    BGH.layer.add(pieceGroup);

    boardPices.push(piece);
    BGHSlots[slotNo][BGHSlotCounter[slotNo]] = piece;

    var pImg = new Kinetic.Image({
        x: 0,
        y: 0,
        image: (isPrime) ? BGHConf.piecePrime : BGHConf.pieceSecond,
        width: BGHConf.piece,
        height: BGHConf.piece,
        name: 'piece_' + slotNo + '_' + piece.index
    });
    pieceGroup.add(pImg);

    pieceGroup.on('dragstart', function (e) {
        this.attrs.drgBefore.x = this.attrs.x;
        this.attrs.drgBefore.y = this.attrs.y;
        BGHUserRolledDice.highlightSlotOn(this.attrs.piece);

    });


    pieceGroup.on('dragend', function (e) {

        if (!pieceDragEnd(this)) {
            this.setPosition({x: this.attrs.drgBefore.x, y: this.attrs.drgBefore.y});
            BGH.board.draw();
        }

        BGHUserRolledDice.highlightSlotOff();
    });

}

function undoMovie() {
    console.log(lastMovePiece.slotNo);
    if (lastMovePiece.slotNo != -1 && lastMovePiece.piece != null && typeof lastMovePiece.grp == 'object') {
        //NOTICE belki buarda sıradaki kullanıcı masa kullanıcısı mı kontrolü yapılabilir.
        BGHUserRolledDice.undoMovePice(Math.abs(lastMovePiece.slotNo - lastMovePiece.piece.slotNo));

        removePiece2Slot(lastMovePiece.piece.slotNo, lastMovePiece.piece.index);
        piece = insertPiece2Slot(lastMovePiece.slotNo, lastMovePiece.piece);
        var pieceGrp = lastMovePiece.grp;
        pieceGrp.attrs.piece = piece;
        movePieceGrp(pieceGrp);
        lastMovePiece.grp = null;
        lastMovePiece.piece = null;
        lastMovePiece.slotNo = -1;
    }
}

function setUserOrder(primeOrSecond) {
    BGHUserOrder = primeOrSecond;
    //TODO eğer sırası gelen oyununcunun kırığı varsa, sadece kırık taşını sokabileceği kontrol buarada yapılacak
    if (BGHuserBreakCnt[primeOrSecond] > 0)
        setPieceDraggable(primeOrSecond, true, 'B');
    else
        setPieceDraggable(primeOrSecond, true);

    setPieceDraggable((primeOrSecond == 'p' ? 's' : 'p'), false);
}

var userPlayCount = 0;

function showUserOrder() {
    $('#userOrderInfo').css('backgroundColor', (BGHUserOrder == 's') ? '#000' : 'grey');

}

function calcAndShowPipPoint(){
     var pointPrime=0;
     var pointSlave=0;
        function calcPoint(objPiece,index,array){
            if (objPiece.status!='F'){
                    if (objPiece.primeOrSecond=='p') {
                        pointPrime +=24-objPiece.slotNo;
                    }else {
                        pointSlave +=objPiece.slotNo+1;
                    }
            }
        }
    
    boardPices.forEach(calcPoint);
    console.log(pointPrime,pointSlave);
    pipPointTextPrime.setText(pointPrime);
    pipPointTextSlave.setText(pointSlave);
    pipPointTextSlave.show();
    pipPointTextSlave.getLayer().draw();
}
function toggleUserOrder() {
    setUserOrder((userPlayCount == 0) ? BGHUserPiece : (BGHUserOrder == 'p') ? 's' : 'p');
    //TODO online olunca diğer oyuncu atilan zar rollDice prm gidecek 
    showUserOrder();
    setTimeout('rollDice()', 1000);
    userPlayCount++;
}

function alertBypass() {
    alert('Gele');
    console.log('gele geldi');
}
function checkBypassing() {
    //GELE Kontrol
      var isBypass=false;
    console.log('checkBypassing',BGHuserBreakCnt[BGHUserOrder],BGHUserOrder);
    if (BGHuserBreakCnt[BGHUserOrder]>0) {
       
        if (BGHUserRolledDice.one && BGHUserRolledDice.two) {
             if (BGHUserOrder=='p') {
                
                  if (BGHUserRolledDice.totalMovePieceCount==2) {
                            if (BGHUserRolledDice.getSetPieceCnt()==1) { 
                                isBypass= (  ( BGHUserRolledDice.remainPieces[1]!=-1 && !BGHUserRolledDice._checkSlot( (BGHUserRolledDice.one - 1),BGHUserOrder ) ) ||
                              (BGHUserRolledDice.remainPieces[2]!=-1 && !BGHUserRolledDice._checkSlot( (BGHUserRolledDice.two - 1),BGHUserOrder ))); 
                            } else {
                              isBypass= (!BGHUserRolledDice._checkSlot( (BGHUserRolledDice.one - 1),BGHUserOrder )  &&
                              !BGHUserRolledDice._checkSlot( (BGHUserRolledDice.two - 1),BGHUserOrder )); 
                            }
                    } else {
                        //çift
                        isBypass = (!BGHUserRolledDice._checkSlot((BGHUserRolledDice.one - 1), BGHUserOrder));
                    }
                } else {

                    if (BGHUserRolledDice.totalMovePieceCount == 2) {

                        if (BGHUserRolledDice.getSetPieceCnt() == 1) {
                            isBypass = ((BGHUserRolledDice.remainPieces[1] != -1 && !BGHUserRolledDice._checkSlot((24 - BGHUserRolledDice.one), BGHUserOrder)) ||
                                    (BGHUserRolledDice.remainPieces[2] != -1 && !BGHUserRolledDice._checkSlot((24 - BGHUserRolledDice.one), BGHUserOrder)));
                        } else {
                            isBypass = (!BGHUserRolledDice._checkSlot((24 - BGHUserRolledDice.one), BGHUserOrder) &&
                                    !BGHUserRolledDice._checkSlot((24 - BGHUserRolledDice.two), BGHUserOrder));

                        }
                    } else {
                        //çift
                        isBypass = (!BGHUserRolledDice._checkSlot((24 - BGHUserRolledDice.one), BGHUserOrder));
                    }
                }
            }
        }

        if (isBypass) {
            alertBypass();
             toggleUserOrder();
            
           
        }

    }

function pieceDragEnd(pieceGrp) {
    if (pieceGrp.hasOwnProperty('attrs')) {
        console.log(pieceGrp.attrs.x, pieceGrp.attrs.y);
        var piece = pieceGrp.attrs.piece;
        if ((piece.status == 'N' && piece.index == BGHSlotCounter[piece.slotNo]) // normal taş ise 
                || piece.status == 'B') //kırık taş ise açık yere gir 
        {
            var dragslotNo = getCoord2Slot(pieceGrp.attrs.x, pieceGrp.attrs.y);
            console.log('dragslotNo:', dragslotNo, BGHSlotOwner[dragslotNo], piece.status, piece.primeOrSecond);
            if (dragslotNo != -1) {
                if (
                        (BGHUserPiece == piece.primeOrSecond && dragslotNo > piece.slotNo && BGHuserBreakCnt[piece.primeOrSecond] == 0) ||
                        (BGHUserPiece != piece.primeOrSecond && dragslotNo < piece.slotNo && BGHuserBreakCnt[piece.primeOrSecond] == 0) ||
                        (piece.status == 'B' && piece.primeOrSecond == BGHUserPiece && [0, 1, 2, 3, 4, 5].indexOf(dragslotNo) != -1) ||
                        (piece.status == 'B' && piece.primeOrSecond != BGHUserPiece && [23, 22, 21, 20, 19, 18].indexOf(dragslotNo) != -1)
                        ) {
                    console.log('dragOk');
                    if ((BGHSlotOwner[dragslotNo] == null || BGHSlotOwner[dragslotNo] == piece.primeOrSecond) || BGHSlotCounter[dragslotNo] == 1) {
                        console.log('dragOk2 ');

                        var piceMoveStep = Math.abs(piece.slotNo - dragslotNo);

                        if (piece.status == 'B') {
                            if ([0, 1, 2, 3, 4, 5].indexOf(dragslotNo) != -1)
                                piceMoveStep = dragslotNo + 1;

                            if ([23, 22, 21, 20, 19, 18].indexOf(dragslotNo) != -1)
                                piceMoveStep = 6 - (dragslotNo % 6);
                        }


                        console.log('piceMoveStep', piceMoveStep);
                        if (BGHUserRolledDice.checkMovePice(piceMoveStep) || DEBUG_MOD) {
                            console.log('dragOk3');
                            BGHUserRolledDice.moveSlotNo = piceMoveStep;
                            movePiece(pieceGrp, piece, dragslotNo, false);
                            return true;
                        }
                    }
                }
            }else {
                if (BGHAggZone.isAggZone(pieceGrp.attrs.x,pieceGrp.attrs.y,piece.primeOrSecond)) {
                    //taş toplama alnına mı bırakıldı
                    console.log('toplama ok');
                    if (BGHAggZone.checkUserAggStatus(piece.primeOrSecond)) {
                        //kullanıcı taşları toplanmak için hazır mı
                        
                        var piceMoveStep = dragslotNo=piece.slotNo ;
                        
                            if ([0, 1, 2, 3, 4, 5].indexOf(dragslotNo) != -1)
                                piceMoveStep = dragslotNo + 1;

                            if ([23, 22, 21, 20, 19, 18].indexOf(dragslotNo) != -1)
                                piceMoveStep = 6 - (dragslotNo % 6);
                                            
                        console.log('topalama ok2',piceMoveStep);
                        
                        var isPrevSlotUse=false;
                         function checkAggDice(pieceSlotNo,piceMoveStep) {
                             
                             function getEmptySlot(startSlotNo, slotCount) {
                                 var emptyCnt=0;
                                if (startSlotNo==18) {
                                    for (var p=startSlotNo; p<(startSlotNo+slotCount) ; p++) {
                                         if (BGHSlotCounter[p]==0) emptyCnt++;
                                     }
                                 } else {
                                      for (var p=startSlotNo;p>=(6-startSlotNo) ; p--) {
                                         if (BGHSlotCounter[p]==0) emptyCnt++;
                                     }
                                 }
                                 console.log('getEmptySlot',startSlotNo,slotCount,emptyCnt);
                                 return (slotCount==emptyCnt);
                             }
                             
                             if (piceMoveStep>0 && piceMoveStep<6){
                                 var startSlotNo= (pieceSlotNo>=18) ? 18 :5;
                                 var isEmpty=getEmptySlot(startSlotNo , 6-piceMoveStep);
                                 isPrevSlotUse=isEmpty;
                                 
                                 if (BGHUserRolledDice.getSetPieceCnt()>0) {
                                     if (BGHUserRolledDice.totalMovePieceCount==2) {
                                         if (BGHUserRolledDice.remainPieces[1]!==-1 && BGHUserRolledDice.one>piceMoveStep 
                                                 && isEmpty ) {
                                             return true;
                                         }
                                         
                                         if (BGHUserRolledDice.remainPieces[2]!==-1 && BGHUserRolledDice.two>piceMoveStep 
                                                 && isEmpty ) {
                                             return true;
                                         }
                                     } else {
                                         if (  BGHUserRolledDice.one>piceMoveStep 
                                                 && isEmpty ) {
                                             return true;
                                         }
                                     }
                                 }
                             }
                             return false;
                         }
                     
                         if (BGHUserRolledDice.checkMovePice(piceMoveStep,true) || checkAggDice(dragslotNo, piceMoveStep)) {
                             // gelen zar uygun mu 
                            console.log('toplama ok3');
                            if (!isPrevSlotUse) // toplanan slotdan büyük zar gelmişse 
                            BGHUserRolledDice.moveSlotNo = piceMoveStep;
                            else {
                               if (BGHUserRolledDice.one!=BGHUserRolledDice.two) {
                                    piceMoveStep= (  BGHUserRolledDice.one>BGHUserRolledDice.two &&  
                                            BGHUserRolledDice.remainPieces[1]!==-1) ? BGHUserRolledDice.one :BGHUserRolledDice.two;
                               }else {
                                   piceMoveStep= BGHUserRolledDice.one;
                               } 
                               BGHUserRolledDice.moveSlotNo = piceMoveStep;
                            }
                            BGHAggZone.movePieceAggZone(pieceGrp);     
                             return true;
                          }
                    }
                }
            }
        }
    }

    return false;
}

function movePiece(pieceGrp, piece, targetSlotNo, isAnimate) {

    var _slotNo = piece.slotNo;
    if (piece.primeOrSecond == BGHUserPiece) {
        lastMovePiece.piece = piece;
        lastMovePiece.grp = pieceGrp;
        lastMovePiece.slotNo = piece.slotNo;
    }

    removePiece2Slot(piece.slotNo, piece.index);
    if (BGHSlotCounter[targetSlotNo] == 1 && BGHSlotOwner[targetSlotNo] != piece.primeOrSecond) {
        //Taş kırma kontrolu
        var b_pieceGrp = getPiece2Group(targetSlotNo, 1);
        if (b_pieceGrp != null) {

            var b_piece = b_pieceGrp.attrs.piece;
            b_piece.status = 'B';
            b_piece.slotNo = -1;
            BGHuserBreakCnt[b_piece.primeOrSecond]++;
            b_piece.index = -1* BGHuserBreakCnt[b_piece.primeOrSecond];
            b_pieceGrp.attrs.piece = b_piece;
            console.log('kirilan grp', b_pieceGrp);            
            BGHSlotCounter[targetSlotNo] = 0;
            moveBreakPiece(b_piece.primeOrSecond, b_pieceGrp);

        }
    }
    
    var tmp_piece_status=piece.status;
     
    piece = insertPiece2Slot(targetSlotNo, piece);
    pieceGrp.attrs.piece = piece;
    BGHUserRolledDice.setMovePice();
    movePieceGrp(pieceGrp, isAnimate);
    fixSlotArea(_slotNo);
    fixSlotArea(targetSlotNo);
    calcAndShowPipPoint();
    if (BGHUserRolledDice.checkNextUserOrder()) {
        toggleUserOrder();
    } else {         
        if (tmp_piece_status=='B') checkBypassing();
    } 
}

function moveBreakPiece(primeOrslave, b_pieceGrp) {
    b_pieceGrp.setDraggable(false);
    var _breakZoneCoord = (primeOrslave == BGHUserPiece) ? BGHConf.breakZoneCoord.prime : BGHConf.breakZoneCoord.second;

    var b_y = _breakZoneCoord.y + ((BGHuserBreakCnt[primeOrslave] - 1) * BGHConf.piece);

    // console.log('moveBreakPiece',b_y);
    b_pieceGrp.setPosition({x: _breakZoneCoord.x, y: b_y});


    BGH.layer.draw();

}

function movePieceGrp(pGroup, isAnimate) {
    if (typeof pGroup == 'object') {
        var coord = calcPieceCoord(pGroup.attrs.piece);
        if (!isAnimate) {
            pGroup.setPosition({x: coord.x, y: coord.y});
            BGH.board.draw();
        } else {
            moviePieceAnimate(pGroup);
        }
    }
}


function movePieceGrpCustom(pGroup, customPieceSize) {
    if (typeof pGroup == 'object') {
        var coord = calcPieceCoord(pGroup.attrs.piece, customPieceSize);
        pGroup.setPosition({x: coord.x, y: coord.y});
        BGH.board.draw();
    }
}


var anim = null;
var animX = 0;
animY = 0;
var animXdirection = 'u';
var animYdirection = 'u';
var animStepX = 1;
var animStepY = 1;
function moviePieceAnimate(pGroup) {
    if (typeof pGroup == 'object') {
        var currPos = {x: pGroup.attrs.x, y: pGroup.attrs.y};
        var finalPos = calcPieceCoord(pGroup.attrs.piece);

        animX = currPos.x;
        animY = currPos.y;

        if (finalPos.x > currPos.x)
            animXdirection = 'u';
        else
            animXdirection = 'd';
        if (finalPos.y > currPos.y)
            animYdirection = 'u';
        else
            animYdirection = 'd';

        animStepX = Math.round((Math.abs(finalPos.x - currPos.x) * 7) / 100);
        animStepY = Math.round((Math.abs(finalPos.y - currPos.y) * 7) / 100);


        anim = new Kinetic.Animation(function (frame) {
            pGroup.setPosition({x: animX, y: animY});

            if (animXdirection == 'u') {
                if (animX != finalPos.x)
                    animX += animStepX;
            } else {
                if (animX != finalPos.x)
                    animX -= animStepX;
            }

            if (animYdirection == 'u') {
                if (animY != finalPos.y)
                    animY += animStepY;
            } else {
                if (animY != finalPos.y)
                    animY -= animStepY;
            }
            if (Math.abs(animY - finalPos.y) <= 10 || Math.abs(animX - finalPos.x) <= 10) {
                anim.stop();
                pGroup.setPosition({x: finalPos.x, y: finalPos.y});
                BGH.board.draw();
            }

        }, BGH.layer);

        anim.start();

    }
}


function movePieceByIndex(slotNo, index, targetSlotNo,primeOrSecond,isBreak) {
    /*remote pul taşı 
     *  primeOrSecond,isBreak kırıktan girmede gelmesi, gereken değerler
     * */
    var pieceGrp =(isBreak===true)?getBreakPiece2Group(primeOrSecond,index) : getPiece2Group(slotNo, index);
                   
    if (pieceGrp != null) {
        var piece = pieceGrp.attrs.piece;
        
        var piceMoveStep = Math.abs(piece.slotNo - targetSlotNo);

                        if (piece.status == 'B') {
                            if ([0, 1, 2, 3, 4, 5].indexOf(targetSlotNo) != -1)
                                piceMoveStep = targetSlotNo + 1;

                            if ([23, 22, 21, 20, 19, 18].indexOf(targetSlotNo) != -1)
                                piceMoveStep = 6 - (targetSlotNo % 6);
                        }


                        console.log('movePieceByIndex', piceMoveStep);
        
        BGHUserRolledDice.moveSlotNo = piceMoveStep;
        movePiece(pieceGrp, piece, targetSlotNo, true);
    }
}

function movePieceAggZoneByIndex(slotNo, index, isPrevSlotUse) {
    //remote pul topla
    var pieceGrp = getPiece2Group(slotNo, index);
    if (pieceGrp != null) {    
      var piece = pieceGrp.attrs.piece;
      var piceMoveStep = dragslotNo=piece.slotNo ;
                        
                            if ([0, 1, 2, 3, 4, 5].indexOf(dragslotNo) != -1)
                                piceMoveStep = dragslotNo + 1;

                            if ([23, 22, 21, 20, 19, 18].indexOf(dragslotNo) != -1)
                                piceMoveStep = 6 - (dragslotNo % 6);
                                            
                       
                            if (!isPrevSlotUse) // toplanan slotdan büyük zar gelmişse 
                            BGHUserRolledDice.moveSlotNo = piceMoveStep;
                            else {
                               if (BGHUserRolledDice.one!=BGHUserRolledDice.two) {
                                    piceMoveStep= (  BGHUserRolledDice.one>BGHUserRolledDice.two &&  
                            BGHUserRolledDice.remainPieces[1] !== -1) ? BGHUserRolledDice.one : BGHUserRolledDice.two;
                } else {
                    piceMoveStep = BGHUserRolledDice.one;
                }
                BGHUserRolledDice.moveSlotNo = piceMoveStep;
            }
            BGHAggZone.movePieceAggZone(pieceGrp);
        }
    }

function insertPiece2Slot(slotNo, piece) {
    BGHSlotCounter[slotNo]++;
    BGHSlotOwner[slotNo] = piece.primeOrSecond;
    piece.slotNo = slotNo;
    piece.index = BGHSlotCounter[slotNo];
    if (piece.status == 'B' && BGHuserBreakCnt[piece.primeOrSecond] > 0) {
        BGHuserBreakCnt[piece.primeOrSecond]--;
        if (BGHuserBreakCnt[piece.primeOrSecond] <= 0) {
            BGHuserBreakCnt[piece.primeOrSecond] = 0;
            setPieceDraggable(piece.primeOrSecond, true);
        }
         
    }
    piece.status = 'N';
    BGHSlots[slotNo][BGHSlotCounter[slotNo]] = piece;
    return piece;
}


function fixSlotArea(slotNo) {
    if (BGHSlotCounter[slotNo] > BGHConf.slotMaxPiece || BGHSlotCustomPieceSize[slotNo] != BGHConf.piece) {
        var newPieceSize = (BGHConf.slotMaxPiece * BGHConf.piece) / BGHSlotCounter[slotNo];

        if (BGHSlotCounter[slotNo] <= BGHConf.slotMaxPiece && BGHSlotCustomPieceSize[slotNo] != BGHConf.piece)
            newPieceSize = BGHConf.piece;

        BGHSlotCustomPieceSize[slotNo] = newPieceSize;
        for (var i = 0; i < (BGHSlotCounter[slotNo] + 1); i++) {
            //   for ( var i=BGHSlotCounter[slotNo]; i>=0;i--) {
            var pieceGrp = getPiece2Group(slotNo, i);
            if (pieceGrp != null) {
                movePieceGrpCustom(pieceGrp, newPieceSize);
            }
        }
    }
}


function getPiece2Group(slotNo, index) {
    var n = BGH.layer.children.length;
    if (n > 0) {
        for (var i = 0; i < n; i++) {
            if (BGH.layer.children[i].hasOwnProperty('attrs') && BGH.layer.children[i].attrs.hasOwnProperty('piece')) {
                var p = BGH.layer.children[i].attrs.piece;
                if (p.index == index && p.slotNo == slotNo)
                    return BGH.layer.children[i];
            }
        }
    }
    return null;
}

function getBreakPiece2Group(primeOrSecond,breakIndexNo) {
    var n = BGH.layer.children.length;
    if (n > 0) {
        for (var i = 0; i < n; i++) {
            if (BGH.layer.children[i].hasOwnProperty('attrs') && BGH.layer.children[i].attrs.hasOwnProperty('piece')) {
                var p = BGH.layer.children[i].attrs.piece;
                if (p.status=='B' && p.primeOrSecond==primeOrSecond &&   p.index === -1*breakIndexNo )
                    return BGH.layer.children[i];
            }
        }
    }
    return null;
}


function removePiece2Slot(slotNo, index) {
    if (slotNo == -1 || index == -1)
        return false;
    BGHSlotCounter[slotNo]--;
    BGHSlots[slotNo][index] = null;
    if (BGHSlotCounter[slotNo] <= 0)
        BGHSlotOwner[slotNo] = null;
}

function getCoord2Slot(x, y) {
    x = x + ((BGHConf.slotWidth * 40) / 100);
    y = y + ((BGHConf.slotWidth * 30) / 100);
    for (var i = 0; i < 24; i++) {
        if (x > BGHSlotCoord[i].x && x < BGHSlotCoord[i].x2 && y > BGHSlotCoord[i].y && y < BGHSlotCoord[i].y2) {
            return i;
        }
    }
    return -1;
}

var diceFloorParts = {};

function initDice() {
    diceLayer = new Kinetic.Layer();
    var bgGroup = new Kinetic.Group({
        x: (BGHConf.boardWidth * 60) / 100,
        y: (BGHConf.boardHeight / 2) - (BGHConf.dice.height / 2),
        draggable: false,
        id: 'diceOne'
        , visible: false
    });

    var bgGroupTwo = new Kinetic.Group({
        x: ((BGHConf.boardWidth * 60) / 100) + BGHConf.dice.width + 20,
        y: (BGHConf.boardHeight / 2) - (BGHConf.dice.height / 2),
        draggable: false,
        id: 'diceTwo'
        , visible: false
    });



    function dicePart() {

        this.bgImg = new Kinetic.Image({
            x: 0,
            y: 0,
            image: BGHConf.dice.bgImg,
            width: BGHConf.dice.width,
            height: BGHConf.dice.height,
            name: 'image'

        });
        this.points = [];

        var pointRadius = Math.round((BGHConf.dice.width * 8) / 100);
        var firstPointCoord = {x: Math.round(BGHConf.dice.width / 5, 2), y: Math.round(BGHConf.dice.width / 5, 2)};
        var pointColor = '#383737';

        this.points[0] = new Kinetic.Circle({
            x: firstPointCoord.x, y: firstPointCoord.y, radius: pointRadius, fill: pointColor,
            id: 'point_1', visible: false
        });

        this.points[1] = new Kinetic.Circle({
            y: firstPointCoord.y + (Math.round(BGHConf.dice.width / 3.5, 2)), x: firstPointCoord.x, radius: pointRadius, fill: pointColor,
            id: 'point_2', visible: false
        });

        this.points[2] = new Kinetic.Circle({
            y: firstPointCoord.y + (Math.round(BGHConf.dice.width / 3.5, 2) * 2), x: firstPointCoord.x, radius: pointRadius, fill: pointColor,
            id: 'point_3', visible: false
        });


        this.points[3] = new Kinetic.Circle({
            x: BGHConf.dice.width - (firstPointCoord.x + pointRadius), y: firstPointCoord.y, radius: pointRadius, fill: pointColor,
            id: 'point_4', visible: false
        });

        this.points[4] = new Kinetic.Circle({
            y: firstPointCoord.y + (Math.round(BGHConf.dice.width / 3.5, 2)), x: BGHConf.dice.width - (firstPointCoord.x + pointRadius), radius: pointRadius, fill: pointColor,
            id: 'point_5', visible: false
        });

        this.points[5] = new Kinetic.Circle({
            y: firstPointCoord.y + (Math.round(BGHConf.dice.width / 3.5, 2) * 2), x: BGHConf.dice.width - (firstPointCoord.x + pointRadius), radius: pointRadius, fill: pointColor,
            id: 'point_6', visible: false
        });

        this.points[6] = new Kinetic.Circle({
            y: Math.round((BGHConf.dice.height - pointRadius) / 2, 2), x: Math.round((BGHConf.dice.width - pointRadius) / 2, 2), radius: pointRadius, fill: pointColor,
            id: 'point_7', visible: false
        });
        return this;
    }

    var dicePartOne = new dicePart();
    var dicePartTwo = new dicePart();
    bgGroup.add(dicePartOne.bgImg);
    bgGroupTwo.add(dicePartTwo.bgImg);
    for (var i = 0; i < 7; i++) {
        bgGroup.add(dicePartOne.points[i]);
        bgGroupTwo.add(dicePartTwo.points[i]);
    }

    //console.log(bgGroup);		
    function dicefloorPart() {
        this.dice_floor1_1 = new Kinetic.Rect({
            x: 1,
            y: 2,
            width: (BGHConf.dice.width - 5),
            height: (BGHConf.dice.height / 2) - 3,
            fill: 'silver',
            id: 'dice_floor_1',
            opacity: 0.7,
            strokeEnabled: false
            , visible: false
        });


        this.dice_floor1_2 = new Kinetic.Rect({
            x: this.dice_floor1_1.getX(),
            y: this.dice_floor1_1.getHeight() + 2,
            width: this.dice_floor1_1.getWidth(),
            height: this.dice_floor1_1.getHeight(),
            fill: 'silver',
            id: 'dice_floor_2',
            opacity: 0.7,
            strokeEnabled: false
            , visible: false
        });
    }

    var diceFloorOne = new dicefloorPart();
    var diceFloorTwo = new dicefloorPart();
    diceFloorParts.one = diceFloorOne;
    diceFloorParts.two = diceFloorTwo;

    bgGroup.add(diceFloorOne.dice_floor1_1);
    bgGroup.add(diceFloorOne.dice_floor1_2);
    bgGroupTwo.add(diceFloorTwo.dice_floor1_1);
    bgGroupTwo.add(diceFloorTwo.dice_floor1_2);
    diceLayer.add(bgGroup);
    diceLayer.add(bgGroupTwo);
    BGH.board.add(diceLayer);
}

function initslotHighlight() {
    slotHighlightLayer = new Kinetic.Layer();

    for (var i = 0; i < 24; i++) {

        var oval = new Kinetic.Ellipse({
            x: BGHSlotCoord[i].x + (BGHConf.slotWidth / 2),
            y: (i >= 12) ? BGHSlotCoord[i].y2 + 1 : BGHSlotCoord[i].y + 1,
            radius: {
                x: 10,
                y: 15
            },
            fill: 'green',
            opacity: 0.5,
            strokeEnabled: false,
            id: 'highlightSlot' + i,
            visible: false

        });
        slotHighlightLayer.add(oval);

    }

    BGH.board.add(slotHighlightLayer);
}

function setSlotHighligtVisibility(slotNo, isShow) {

    if (slotNo > 23 || slotNo < 0)
        return false;
    var hOval = slotHighlightLayer.get('#highlightSlot' + slotNo);
    if (isShow)
        console.log('hOval', slotNo);
    if (typeof hOval == 'object') {
        hOval = hOval[0];
        if (isShow)
            hOval.show();
        else
            hOval.hide();
    }
}

function initBoard() {
    BGH.board = new Kinetic.Stage({
        container: 'container',
        width: BGHConf.boardWidth,
        height: BGHConf.boardHeight

    });


    BGH.layer = new Kinetic.Layer();


    var bgGroup = new Kinetic.Group({
        x: 0,
        y: 0,
        draggable: false
    });

    //  bgGroup.prototype.slotNo=1;

    BGH.layer.add(bgGroup);


    var bgImg = new Kinetic.Image({
        x: 0,
        y: 0,
        image: BGHConf.bgImg,
        width: BGHConf.boardWidth,
        height: BGHConf.boardHeight,
        name: 'image'
    });

    //console.log(bgGroup);
    bgGroup.add(bgImg);
   
    //TODO text ve ölçüleri conf dan gelecek
 
    
     var grpPipPrime = new Kinetic.Group({
           x: BGHConf.pipPoint.x,
            y: BGHConf.pipPoint.y,
            width: BGHConf.pipPoint.width,
            height: BGHConf.pipPoint.fontSize*1.3             
          

        });
    
        pipPointTextPrime =new Kinetic.Text({
            x: 1,
            y: 1,
            text: '',
            fontSize: BGHConf.pipPoint.fontSize,
            fontFamily: BGHConf.pipPoint.fontFamily,
            width:BGHConf.pipPoint.width ,
            align: 'center',    
            fill: BGHConf.pipPoint.fontColor,
            textFill: 'white',
        });
        
       grpPipPrime.add(pipPointTextPrime); 
        
        var grpPipSlave = new Kinetic.Group({
          x: BGHConf.pipPoint.x,
            y: (BGHConf.pipPoint.y)+BGHConf.pipPoint.fontSize*1.2,
            width: BGHConf.pipPoint.width,
            height: BGHConf.pipPoint.fontSize*1.3            
           

        });    
       
     pipPointTextSlave = new Kinetic.Text({
            x:1,
            y: 1,
            text: '',
            fontSize: BGHConf.pipPoint.fontSize,
            fontFamily: BGHConf.pipPoint.fontFamily,
            width:BGHConf.pipPoint.width ,
            align: 'center',    
            fill: BGHConf.pipPoint.fontColor,
             textFill: 'white',
        });
          grpPipSlave.add(pipPointTextSlave); 
          
        BGH.layer.add(grpPipPrime);
        BGH.layer.add(grpPipSlave);
        
       

}

function drawBGH() {
    BGH.board.add(BGH.layer);
    BGH.board.draw();
}

function addSlotPieces(slotNo, isPrime, quantity) {
    for (var n = 0; n < quantity; n++)
        addPiece(isPrime, slotNo);
}

function setOutPieces() {
    //Yeni el diz
    var isPrime = (BGHUserPiece == 'p') ? true : false;
    addSlotPieces(0, isPrime, 2);
    addSlotPieces(23, !isPrime, 2);
    addSlotPieces(5, !isPrime, 5);
    addSlotPieces(18, isPrime, 5);
    addSlotPieces(7, !isPrime, 3);
    addSlotPieces(16, isPrime, 3);
    addSlotPieces(11, isPrime, 5);
    addSlotPieces(12, !isPrime, 5);
}

function newGame() {
    reset();
    initBoard();
    setOutPieces();
    drawBGH();
    initDice();
    initslotHighlight();
}


function  initPieces() {
    return false;
    addPiece(true, 0);
    addPiece(true, 0);

    addPiece(false, 1);
    addPiece(true, 0);
    addPiece(true, 0);
    addPiece(true, 0);
    addPiece(true, 0);

    addPiece(false, 1)
    addPiece(false, 12);
    addPiece(false, 12);

    addPiece(true, 20);
    addPiece(true, 20);

    addPiece(false, 12);
    addPiece(false, 12);

    addPiece(true, 20);
    addPiece(true, 20);
}

loadImages();