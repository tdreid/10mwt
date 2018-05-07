/* global ko _ Stopwatch Clipboard $ localforage */
window.onload = function() {
  var Tests = function(tests = []) {
    var self = this;
    this.tests = ko.observableArray(tests);
    this.newId = ko.observable('');
    this.showMessage = ko.observable(false);
    this.adjustTopMargin = ko.observable(false);

    function sorter(a, b) {
      return a.id() > b.id();
    }

    function finder(t) {
      return t.id() === self.newId();
    }

    this.displayJSON = ko.observable(false);

    this.addTest = function() {
      if (this.newId() !== '' && !_.find(this.tests(), finder)) {
        this.tests.push(
          new Test(this.newId(), [new Trial(), new Trial(), new Trial()])
        );
        this.tests.sort(sorter);
        this.newId('');
      } else {
        this.showMessage('Blanks and duplicates are not allowed.');
        setTimeout(
          function() {
            this.showMessage(false);
          }.bind(this),
          750
        );
      }
    }.bind(this);

    this.saveViewModel = function() {
      var flattenedTests = self.tests().map(t => {
        return ko.toJSON(t);
      });
      localforage.setItem('10mwt', flattenedTests);
    };

    this.loadViewModel = function() {
      localforage.getItem('10mwt').then(savedtests => {
        self.clearViewModel();
        savedtests.forEach(item => {
          item = JSON.parse(item);
          let savedtrials = item.trials.map(savedTrial => {
            let newTrial = new Trial();

            newTrial.s(savedTrial.s);
            newTrial.s2(savedTrial.s2);
            newTrial.state(savedTrial.state);
            newTrial.stateLabel(savedTrial.stateLabel);

            return newTrial;
          });
          self.tests.push(new Test(item.id, savedtrials));
        });
      });
    };

    this.clearViewModel = function() {
      self.tests([]);
    };

    this.togglePush = function() {
      self.adjustTopMargin(!$('#menu').hasClass('show'));
    };
  };

  var Test = function(id = 'New Test', trials = []) {
    var self = this;
    this.id = ko.observable(id);
    this.trials = ko.observableArray(trials);
    this.isFast = ko.observable(false);
    this.gaitText = ko.computed(function() {
      return self.isFast() ? 'fastest possible' : 'comfortable';
    });

    this.averageTimeToAmbulate = ko.computed(function() {
      function isReady(trial) {
        return trial.s() > 0 && trial.s2() > 0;
      }

      if (self.trials().length === 3 && self.trials().every(isReady)) {
        return (
          self.trials().reduce(function(a, b) {
            return a + parseFloat(b.timeToAmbulate());
          }, 0) / self.trials().length
        ).toFixed(2);
      } else {
        return '';
      }
    });

    this.averageGaitSpeed = ko.computed(function() {
      if (self.averageTimeToAmbulate()) {
        return (6 / self.averageTimeToAmbulate()).toFixed(2);
      } else {
        return '';
      }
    });

    this.isReady = ko.computed(function() {
      return self.trials().every(function(trial) {
        return trial.state() === 3;
      });
    });

    this.addTrial = function() {
      this.trials.push(new Trial());
    }.bind(this);
  };

  var Trial = function(isFast = false) {
    var self = this;
    this.s = ko.observable('');
    this.s2 = ko.observable('');
    this.stateLabel = ko.observable('Start Timer');
    this.state = ko.observable(0);

    var stopwatch = new Stopwatch(update, 10);

    function update(watch) {
      var elapsed = watch.getElapsed();
      var seconds = elapsed.minutes * 60 + elapsed.seconds;
      var milliseconds = elapsed.milliseconds;
      var totalTime = seconds + milliseconds / 1000;
      self.state() === 1
        ? self.s(totalTime.toFixed(2))
        : self.s2(totalTime.toFixed(2));
    }

    this.nextState = function() {
      switch (this.state()) {
        case 0:
          stopwatch.start();
          this.state(1);
          this.stateLabel('Click at 2m Mark');
          break;
        case 1:
          this.state(2);
          this.stateLabel('Click at 8m Mark');
          break;
        case 2:
          stopwatch.stop();
          this.state(3);
          break;
      }
    };

    this.timeToAmbulate = ko.computed(function() {
      var ret = self.s2() - self.s();
      if (ret > 0) {
        return ret.toFixed(2);
      } else {
        return '';
      }
    });
  };

  var tests = new Tests();
  ko.applyBindings(tests);
  var clip = new Clipboard('.btn-copy');
  clip.on('success', function(e) {
    tests.showMessage('Narrative copied.');
    setTimeout(function() {
      tests.showMessage(false);
    }, 750);
  });
  $('#bullpen').css('visibility', 'visible');
  $('#main').css('visibility', 'visible');
};
