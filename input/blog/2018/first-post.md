Title: First Post
Lead: Obligatory "Hello World" post.
Published: 4/16/2018
Tags: Introduction
---
This is my first post!

```cs
static int Main(string[] args)
{
    Console.WriteLine("Hello, World!");
    return 0;
}
```

```rust
fn main() {
    println!("Hello, World!");
}
```
```fsharp
open System

[<EntryPoint>]
let main argv = 
    printfn "Hello, World!" 
    Console.ReadLine() |> ignore
    0
```

Currently playing around with the [Wyam](https://wyam.io/) static site generator.