websocket(function(socket) {

  //
  // cache some of the frequently referred to DOM elements.
  //
  var startKey = $('#startKey');
  var endKey = $('#endKey');
  var limit = $('#limit');
  var controls = $('.control');
  var keyList = $('#keyContainer');
  var veryLarge = $('#veryLarge');
  var selectOne = $('#selectOne');

  var keyTemplate = '<option value="{{key}}" title="{{key}}">{{key}}</option>';

  var currentSelection = '';
  var currentDatasource = 'usrdb';

  function write(message) {
    message.dbname = currentDatasource;
    message = JSON.stringify(message);
    socket.write(message);
  }

  function getOpts() {

    var opts = {
      limit: parseInt(limit.val()) || 100,
      reverse: !!$('#reverse:checked').length,
    };

    if (startKey.val().length > 0) {
      opts.start = startKey.val();
    }

    if (endKey.val().length > 0 && $('#range:checked').length) {
      opts.end = endKey.val();
    }

    return opts;
  }

  var inputBounce;
  function keyListUpdate() {

    clearTimeout(inputBounce);
    inputBounce = setTimeout(function() {

      write({ 
        request: 'keyListUpdate', 
        value: getOpts()
      });

    }, 16);
  }

  //
  // when there is data from the server
  //
  socket.on('data', function(message) {

    try { message = JSON.parse(message); } catch(ex) {}

    var response = message.response;
    var value = message.value;

    //
    // when a value gets an update
    //
    if (response === 'editorUpdate') {
      if (JSON.stringify(value.value).length < 1e4) {
        veryLarge.hide();
        editor_json.doc.setValue(JSON.stringify(value.value, 2, 2));
      }
      else {
        veryLarge.show();
        veryLarge.unbind('click');
        veryLarge.on('click', function() {
          editor_json.doc.setValue(JSON.stringify(value.value, 2, 2));
          veryLarge.hide();
        });
      }
    }

    //
    // when there is an update for the list of keys
    //
    else if (response === 'keyListUpdate') {

      keyList.empty();

      message.value.forEach(function(key) {
        keyList.append(keyTemplate.replace(/{{key}}/g, key));
      });
    }

    else if (response === 'metaUpdate') {

      if (value.path) {
        $('#pathtodb').text(value.path);
      }
    }

    //
    // TODO: Should show success or error on delete.
    //

  });

  $('nav.secondary input').on('click', function() {

    if(this.id === 'nav-all') {
      currentDatasource = 'usrdb';
    }
    else {
      currentDatasource = 'sysdb';
    }

    selectOne.show();
    keyListUpdate();

  });
  

  //
  // when a user selects a single item from the key list
  //
  keyList.on('change', function() {

    var values = [];

    keyList.find('option:selected').each(function(key){
      values.push({ type: 'del', key: this.value });
    });

    if (values.length > 1) {

      selectOne.show();
    }
    else {

      selectOne.hide();
      currentSelection = this.value;

      write({
        request: 'editorUpdate', 
        value: this.value 
      });
    }
  });

  //
  // when a user wants to delete one or more keys from the key list
  //
  $('#delete-keys').on('click', function() {

    var operations = [];

    keyList.find('option:selected').each(function(key){
      operations.push({ type: 'del', key: this.value });
    });

    var value = { operations: operations, opts: getOpts() };

    write({
      request: 'deleteValues',
      value: value
    });

    selectOne.show();
  });

  $('#range').on('click', function() {

    if ($('#range:checked').length === 0) {
      $('#endKeyContainer').hide();
      $('#startKeyContainer .add-on').text('Search');
      $('.keyList').removeClass('extended-options');
    }
    else {
      $('#endKeyContainer').show();
      $('#startKeyContainer .add-on').text('Start');
      $('.keyList').addClass('extended-options');
    }
  });

  //
  // when a user is trying to enter query criteria
  //
  controls.on('keyup mouseup click', keyListUpdate);

  //
  // build the editor.
  //
  var editor_json = CodeMirror.fromTextArea(document.getElementById("code-json"), {
    lineNumbers: true,
    mode: "application/json",
    gutters: ["CodeMirror-lint-markers"],
    lintWith: CodeMirror.jsonValidator,
    viewportMargin: Infinity
  });

  var saveBounce;
  editor_json.on('change', function(cm, change) {

    console.log('CHANGE', change)

    clearTimeout(saveBounce);
    saveBounce = setTimeout(function() {

      if(cm._lintState.marked.length === 0 && cm.doc.isClean() === false) {

        var value = { key: currentSelection, value: JSON.parse(editor_json.doc.getValue()) };

        write({
          request: 'updateValue',
          value: value
        });
      }

    }, 800);

  });
});



