+++
title = "Testing two"
date = 2022-05-29
description = "Introduction post as I narrow down my site"

[taxonomies]
tags = [ "Hello", "test" ]
project-tags = [ "Waterlogged" ]
+++

Suppose you call your friend for some help and at that time he is busy with some work. He told you that he will callback you after some time. This process is called callback and when it comes to programming, the process of calling back a function from another function is called callback.

To understand this let us suppose there is a function A doing some work, and there is a function B doing some other work. When we call function A in our main code and in function A we also called function B then it is called callback function because here function A is calling function B in its code.

Calling of function from a function is done by using function pointers. Function pointers are pointers that hold the address of execution of another function.

We will see some examples to better understand this.
Example 1:
```c,linenos
#include <stdio.h>
#include <stdlib.h>

// Function 1
void func1 () {
    printf("I am in function 1\n") ;
}

// Function 2
void func2(void (*fptr) ()) {
    printf("I am in Function 2\n") ;
    fptr() ;  // Callback function 
    printf("I am again in Function 2\n") ;
}

int main() {

    // Declare a function pointer
    void (*ptr) ;

    // Assign func1 to ptr
    ptr = func1 ;

    // call the func2
    func2(ptr) ;
    return 0 ;
}```

```c
#include <stdio.h>
#include <stdlib.h>
 
// Function 1
void func1 () {
    printf("I am in function 1\n") ;
}
 
// Function 2
void func2(void (*fptr) ()) {
    printf("I am in Function 2\n") ;
    fptr() ;  // Callback function
    printf("I am again in Function 2\n") ;
}
 
int main() {
 
    // Declare a function pointer
    void (*ptr) ;
 
    // Assign func1 to ptr
    ptr = func1 ;
 
    // call the func2
    func2(ptr) ;
    return 0 ;
}
```

Output:
```
PS C : \ Users \ ASUS \ Desktop \ Crazy Programmer Work > cd " c : \ Users \ ASUS \ Desktop \ Crazy Programmer Work \ " ; if ( $? ) { gcc test.c -o test } ; if ($?) { . \ test }
I am in Function 2
I am in function 1
I am again in Function 2

	
PS C : \ Users \ ASUS \ Desktop \ Crazy Programmer Work > cd " c : \ Users \ ASUS \ Desktop \ Crazy Programmer Work \ " ; if ( $? ) { gcc test.c -o test } ; if ($?) { . \ test }
I am in Function 2
I am in function 1
I am again in Function 2
 ```

Here we can see that in function 2, first we are printing some statements and then we are calling function 1 in it. This process is called the callback function where an existing function calls another function in it. We can see that after function 1 is executed, execution control again comes to function 2 and executes all the remaining statements in function 2.

We can use callback methods for writing some efficient programs.

Now let’s see another example where we are going to see some functions and how we are calling another function in that function and we will see how the callback method helps us in writing a smaller number of codes for the same problem statements.
Example 2:
```c
#include <stdio.h>
#include <stdlib.h>

// Function to return the sum of 2 numbers
int sum(int a, int b) {
    return a + b ;
}

// function to greet hello to user and call the sum function to 
// print the sum of two numbers. It implements the callback method.
void greetHello(int (*fptr) (int, int)) {
    printf("Hello from Crazy Programmer\n") ;
    printf("Sum of 7 and 5 is %d\n", fptr(5, 7)) ;
}

// Function to greet Good morning to user and call the sum function
// to print the sum of 2 number. It implements the callback method.
void greetUser(int (*fptr) (int, int)) {
    printf("Good Morning from Crazy Programmer\n") ;
    printf("Sum of 7 and 5 is %d\n", fptr(5, 7)) ; 
}

// main function
int main() {

    // Declare a function pointer to store the address of another function
    int (*ptr)(int, int) ;
    // assign sum function to function pointer
    ptr = sum ;

    // call the greethello function and pass ptr as argument in it.
    greetHello(ptr) ;
    printf("\n") ;
    // call the greetUser function and pass ptr as argument in it.
    greetUser(ptr) ;
    return 0 ;
}
	
#include <stdio.h>
#include <stdlib.h>
 
// Function to return the sum of 2 numbers
int sum(int a, int b) {
    return a + b ;
}
 
// function to greet hello to user and call the sum function to
// print the sum of two numbers. It implements the callback method.
void greetHello(int (*fptr) (int, int)) {
    printf("Hello from Crazy Programmer\n") ;
    printf("Sum of 7 and 5 is %d\n", fptr(5, 7)) ;
}
 
// Function to greet Good morning to user and call the sum function
// to print the sum of 2 number. It implements the callback method.
void greetUser(int (*fptr) (int, int)) {
    printf("Good Morning from Crazy Programmer\n") ;
    printf("Sum of 7 and 5 is %d\n", fptr(5, 7)) ;
}
 
// main function
int main() {
 
    // Declare a function pointer to store the address of another function
    int (*ptr)(int, int) ;
    // assign sum function to function pointer
    ptr = sum ;
 
    // call the greethello function and pass ptr as argument in it.
    greetHello(ptr) ;
    printf("\n") ;
    // call the greetUser function and pass ptr as argument in it.
    greetUser(ptr) ;
    return 0 ;
}
 ```

Output:
```
PS C : \ Users \ ASUS \ Desktop \ Crazy Programmer Work > cd " c : \ Users \ ASUS \ Desktop \ Crazy Programmer Work \ " ; if ( $? ) { gcc test.c -o test } ; if ($?) { . \ test }
Hello from Crazy Programmer
Sum of 7 and 5 is 12

Good Morning from Crazy Programmer
Sum of 7 and 5 is 12

	
PS C : \ Users \ ASUS \ Desktop \ Crazy Programmer Work > cd " c : \ Users \ ASUS \ Desktop \ Crazy Programmer Work \ " ; if ( $? ) { gcc test.c -o test } ; if ($?) { . \ test }
Hello from Crazy Programmer
Sum of 7 and 5 is 12
 
Good Morning from Crazy Programmer
Sum of 7 and 5 is 12
```

In this example, we can see that we have used 3 functions to demonstrate to working of callback method. In function greethello we can see that we have called the sum function to print the sum of 2 numbers.

In greetUser function, we are calling the sum function to print the sum of 2 numbers.

In both of the functions, we are demonstrating the callback method.

Let’s suppose that you want to implement a feature in which a function greet hello and print the sum of 2 numbers to any user and in another scenario a function greet good morning and print the sum of 2 numbers to the user.

Generally, to implement the above scenario we have to write 2 different functions. Both of the function contains some code that will be similar in it. To overcome this problem, we are using callback function so that no function contains duplicate code. And the implementation can be seen from the above example.
Conclusion

# test

Callback function in c programming means that we want to call a different function from another function. This will help us to write clean and non-duplicate code. The callback method is very useful when we want to use a function in another function and avoid the rewriting of the same function.