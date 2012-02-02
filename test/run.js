// loads all of steal's command line tests

steal('steal/build/test/run.js')
.then('steal/build/styles/test/styles_test.js')
.then('steal/get/test/get_test.js')
.then('steal/clean/test/clean_test.js')
.then('steal/generate/test/run.js')
.then('steal/less/test/less_test.js')
.then('steal/coffee/coffee_build_test.js');
