if(navigator.onLine == true){
  // We can fetch new data from the API and add these to the view
  // these will the update / overwrite the data in the local storage for offline use.

  $(document).ready(function(){

      $.get('/api/todos',function(res){
        localStorage.setItem("todos",JSON.stringify(res));
        $.each(res,function(index,value){
          $("#todoList").prepend("<div class='todo'><p class='todoTitle'><input "+(value.complete == true ? 'checked=checked' : '')+" type='checkbox' class='todoCheck' data-todoId='"+value._id+"'>"+value.title+"</p><p class='todoDesc'>"+value.description+"</p></div>");
        });
      },"json");


      $("#todoButton").on("click",function(e){
        e.preventDefault();
        $("#todoList").html("");
        $.post('/api/todos/put',{title:$("#todoTitle").val()},function(res){
          $.each(res,function(index,value){
            $("#todoList").prepend("<div class='todo'><p class='todoTitle'><input "+(value.complete == true ? 'checked=checked' : '')+" type='checkbox' class='todoCheck' data-todoId='"+value._id+"'>"+value.title+"</p><p class='todoDesc'>"+value.description+"</p></div>");
          });
        });
      });

      $("body").on("click",".todoCheck",function(){
        var id = $(this).attr("data-todoId");
        var c = false;
        if($(this).is(':checked')){
          c = true;
        }
        $.post("/api/todos/complete",{"id":id,complete:c},function(res){});
      });

  });

}else{
  console.log("HEERE");
  // We are offline so will need to pull data from the local storage bin.
  $.each(JSON.parse(localStorage.todos),function(index,value){
    $("#todoList").prepend("<div class='todo'><p class='todoTitle'><input "+(value.complete == true ? 'checked=checked' : '')+" type='checkbox' class='todoCheck' data-todoId='"+value._id+"'>"+value.title+"</p><p class='todoDesc'>"+value.description+"</p></div>");
  });
}


if('serviceWorker' in navigator){
  console.log('Registration In Progress');
  navigator.serviceWorker.register('../sw.js').then(function(){
    console.log('Registration Complete');
  }, function(){
    console.log('Registration Failed');
  });
}else{
  console.log('Service Worker Not Supported');
}
