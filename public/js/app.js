/* global ko _ Stopwatch Clipboard $ localforage */
window.onload = function() {
  let Tests = function(tests = []) {
    let thisViewModel = this;
    this.tests = ko.observableArray(tests);
    this.newId = ko.observable('');
    this.showMessage = ko.observable(false);
    this.adjustTopMargin = ko.observable(false);
    this.url = ko.observable('');
    this.showJSON = ko.observable(false);

    function sorter(a, b) {
      return a.id() > b.id();
    }

    function finder(t) {
      return t.id() === thisViewModel.newId();
    }

    this.addTest = function() {
      if (this.newId() !== '' && !_.find(this.tests(), finder)) {
        this.tests.push(
          new Test(this.newId(), [new Trial(), new Trial(), new Trial()])
        );
        this.tests.sort(sorter);
        this.newId('');
        this.saveViewModel();
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

    this.removeTest = function(t) {
      let newArr = thisViewModel.tests().filter(o => o.id !== t.id);
      thisViewModel.tests(newArr);
      thisViewModel.saveViewModel();
    };

    this.saveViewModel = () => {
      let flattenedTests = thisViewModel.tests().map(t => {
        return ko.toJSON(t);
      });
      localforage.setItem('10mwt', flattenedTests);
    };

    this.loadViewModel = () => {
      localforage.getItem('10mwt').then(savedtests => {
        thisViewModel.clearViewModel();
        if (savedtests) {
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
            thisViewModel.tests.push(new Test(item.id, savedtrials));
          });
        } else {
          console.log('No saved tests found to load.');
        }
      });
    };

    this.clearViewModel = () => thisViewModel.tests([]);

    this.togglePush = () =>
      thisViewModel.adjustTopMargin(!$('#menu').hasClass('show'));

    this.saveNarrativePostUrl = () =>
      localforage.setItem('10mwt-url', thisViewModel.url());
  };

  let Test = function(id = 'New Test', trials = []) {
    let thisTest = this;
    this.id = ko.observable(id);
    this.trials = ko.observableArray(trials);
    this.isFast = ko.observable(false);
    this.gaitText = ko.computed(
      () => (thisTest.isFast() ? 'fastest possible' : 'comfortable')
    );

    this.averageTimeToAmbulate = ko.computed(() => {
      function isReady(trial) {
        return trial.s() > 0 && trial.s2() > 0;
      }

      if (thisTest.trials().length === 3 && thisTest.trials().every(isReady)) {
        return (
          thisTest.trials().reduce((a, b) => {
            return a + parseFloat(b.timeToAmbulate());
          }, 0) / thisTest.trials().length
        ).toFixed(2);
      } else {
        return '';
      }
    });

    this.averageGaitSpeed = ko.computed(() => {
      if (thisTest.averageTimeToAmbulate()) {
        return (6 / thisTest.averageTimeToAmbulate()).toFixed(2);
      } else {
        return '';
      }
    });

    this.isReady = ko.computed(() => {
      return thisTest.trials().every(trial => {
        return trial.state() === 3;
      });
    });

    this.addTrial = function() {
      this.trials.push(new Trial());
    }.bind(this);

    this.postNarrative = function() {
      console.log('Posting...');
      $.post(
        tests.url(),
        ko.toJSON(
          'When assessed with the 10-meter walk test, ' +
            thisTest.id() +
            ' had a ' +
            thisTest.gaitText() +
            ' walking speed of ' +
            thisTest.averageGaitSpeed() +
            ' m/s today.'
        ),
        () => {
          console.log('Post complete.');
          tests.showMessage('Narrative posted.');
          setTimeout(() => tests.showMessage(false), 750);
        },
        'text'
      );
    }.bind(this);
  };

  let Trial = function(isFast = false) {
    let thisTrial = this;
    this.s = ko.observable('');
    this.s2 = ko.observable('');
    this.stateLabel = ko.observable('Start Timer');
    this.state = ko.observable(0);

    let stopwatch = new Stopwatch(update, 10);

    function update(watch) {
      let elapsed = watch.getElapsed();
      let seconds = elapsed.minutes * 60 + elapsed.seconds;
      let milliseconds = elapsed.milliseconds;
      let totalTime = seconds + milliseconds / 1000;
      thisTrial.state() === 1
        ? thisTrial.s(totalTime.toFixed(2))
        : thisTrial.s2(totalTime.toFixed(2));
    }

    this.nextState = () => {
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
          tests.saveViewModel();
          break;
      }
    };

    this.timeToAmbulate = ko.computed(() => {
      let ret = thisTrial.s2() - thisTrial.s();
      if (ret > 0) {
        return ret.toFixed(2);
      } else {
        return '';
      }
    });
  };

  let tests = new Tests();
  ko.applyBindings(tests);
  localforage.getItem('10mwt-url').then(url => tests.url(url));
  tests.loadViewModel();
  let clip = new Clipboard('.btn-copy');
  clip.on('success', e => {
    tests.showMessage('Narrative copied.');
    setTimeout(() => tests.showMessage(false), 750);
  });
  $(document).ajaxError((eve, req, set, err) => {
    tests.showMessage('Error posting narrative.' + err ? ' ' + err + '.' : '');
    setTimeout(() => tests.showMessage(false), 750);
  });
  $('#bullpen').css('visibility', 'visible');
  $('#main').css('visibility', 'visible');
};
