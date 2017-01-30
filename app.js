window.onload=function(){
var Tests = function(tests = []) {
  var self = this;
  this.tests = ko.observableArray(tests);
  this.newId = ko.observable("");
  this.displayJSON = ko.observable(true); //set to true for debugging

  function sorter(a, b) {
    return a.id() > b.id();
  }

  function finder(t) {
    return t.id() === self.newId();
  }

  this.addTest = function() {
    if ((this.newId() != "") && !(_.find(this.tests(), finder))) {
      this.tests.push(new Test(this.newId()));
      this.tests.sort(sorter);
      this.newId("");
    } else {
      //flash no blanks & no dupes
    }
  }.bind(this);
}

var Test = function(id = "New Test", trials = []) {
  this.id = ko.observable(id);
  this.trials = ko.observableArray(trials);

  this.addTrial = function() {
    this.trials.push(new Trial());
  }.bind(this);
}

var Trial = function(isFast = false) {
  var self = this;
  this.isFast = ko.observable(isFast);
  this.isComplete = ko.observable(false);
  this.s = ko.observable(0);
  this.s2 = ko.observable(0);
  this.stateLabel = ko.observable("Start Timer");
  this.state = ko.observable(0);
  this.nextState = function(){
      switch(this.state()){
          case 0:
              this.state(1);
              this.stateLabel("Click at 2m Mark");
              break;
          case 1:
              this.state(2);
              this.stateLabel("Click at 8m Mark");
              break;
          case 2:
              this.state(3);
              break;
      }
  }
  this.timeToAmbulate = ko.computed(function() {
    var ret = self.s2() - self.s();
    if (ret > 0) {
      return ret.toFixed(2);
    } else {
      return "";
    }
  });
}

ko.applyBindings(new Tests());
    
}