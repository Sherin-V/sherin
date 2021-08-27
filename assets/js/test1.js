
const pass_reg = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

function formValidation(oEvent) {
    oEvent = oEvent || window.event;
    var txtField = oEvent.target || oEvent.srcElement;

    let t1ck = true;
    
    if (document.getElementById("names").value.length <=3) { t1ck = false;
      
    }

    if (document.getElementById("subject").value.length <=3) { t1ck = false;
      
    }

    if (document.getElementById("message").value.length <=3) { t1ck = false;
      
    }
    if (!pass_reg.test((document.getElementById("email").value ))) { t1ck = false; 
            
    }
    
    
    if (t1ck) { document.getElementById("button").disabled = false; } 
    else { document.getElementById("button").disabled = true; }
    }



    window.onload = function() {

        var btnSignUp = document.getElementById("button");
        var names = document.getElementById("names");
        var email = document.getElementById("email");
        var subject = document.getElementById("subject");
        var message = document.getElementById("message");
        document.getElementById("button").disabled = true;
        names.onkeyup = formValidation;
        email.onkeyup = formValidation;
        subject.onkeyup = formValidation;
        message.onkeyup = formValidation;
        names.onclick = formValidation;
        email.onclick = formValidation;
        subject.onclick = formValidation;
        message.onclick = formValidation;   
    }



    const form = document.querySelector('#submit-form');


    let names = form.elements.namedItem("names");
    let email = form.elements.namedItem("email");
    let subject = form.elements.namedItem("subject");
    let message = form.elements.namedItem("message");
    const emailText = document.querySelector('.mailtext');
    names.addEventListener('input', validate);
    email.addEventListener('input', validate);
    subject.addEventListener('input', validate);
    message.addEventListener('input', validate);

form.addEventListener('submit', function (e) {
 e.preventDefault();
 
 
});

    function validate (e) {
    if (e.target.name == "email") {
     if (pass_reg.test(e.target.value)) {
      e.target.classList.add('valid');
      e.target.classList.remove('invalid');
      emailText.innerHTML = "Valid Email ";
       
     } else {
      e.target.classList.add('invalid');
      e.target.classList.remove('valid');
      emailText.innerHTML = "Must be a valid email address."; 
     }
 }
 
 if (e.target.name == "names") {
  if (e.target.value.length > 3) {
   e.target.classList.add('valid');
   e.target.classList.remove('invalid');
  } else {
   e.target.classList.add('invalid');
   e.target.classList.remove('valid');
  }
 }

 if (e.target.name == "subject") {
    if (e.target.value.length > 3) {
     e.target.classList.add('valid');
     e.target.classList.remove('invalid');
    } else {
     e.target.classList.add('invalid');
     e.target.classList.remove('valid');
    }
   }

   if (e.target.name == "message") {
    if (e.target.value.length > 3) {
     e.target.classList.add('valid');
     e.target.classList.remove('invalid');
    } else {
     e.target.classList.add('invalid');
     e.target.classList.remove('valid');
    }
   }
}
