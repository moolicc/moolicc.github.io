Title: Creating an Entity Component System in c# - Part 3
Lead: |
    We shall explore the creation and usage of an Entity-Component-System in a couple posts.
    In this post, we'll optimize the entire thing so that it is not  hor·ren·dous·ly overweight.
Published: 6/20/2018
Tags:
 - C#
 - MonoGame
 - Game Development
 - Design Pattern
---
# The Entity-Component-System
The *Entity Component System* (We'll abbreviate it *ECS* for the sake of brevity) is designed to break away coupling that is naturally introduced when taking advantage of object-oriented-programming.
It achieves this by preferring to create *entities* with **composition** rather than **inheritance**.
It works by assigning various *Components* to each *Entity* - such that an entity is nothing more than a container for components - and then various *Systems* to act on said components. This in turn, makes the code much easier to maintain and expand upon.

Want to add hunger into a survival game?
  * Step 1: add a *HungerComponent* and assign it to the entity that represents the player.
  * Step 2: add a *HungerSystem* which monitors the *HungerComponent* and performs whatever actions are necessary and related to hunger. Maybe the system reaches out to a *HealthComponent* and depletes health. I don't know.

The beauty of an ECS, in my opinion, is the separation of logic and data it entails. Data is placed in components and logic is placed in systems.

-------------------------
# 2018 Horror Movie Set to Change the World: *The Optimizing*

Alright, alright. So initially we were going to explore the use of components defined in a DSL that resembled something like:
```cs
Name("BoundsComponent")
Property<Rectangle>("Bounds")
Proxy("X", "Bounds.X")
Proxy("Y", "Bounds.Y")
Proxy("Width", "Bounds.Width")
Proxy("Height", "Bounds.Height")
```
We were going to exploit both Roslyn and Reflection, to make the declaration of components both dynamic, and simplistic.

But alas, I wrote-up a prototype and decided it didn't work out quite as nicely as I had hoped. Components turned-out to be cumbersome to work with in the actual game.

So instead, let us  go forth, and optimize our current solution. For yea, right now, she is like unto an overweight beast.

(**NOTE:** *I had actually planned on writing a post about optimizing it after we got something working, it's just that the dynamic component thing was going to come first*)

# The Plan
So our primary performance concerns right now are basically summed-up into these  bullet points:
  * Binary Search that the Dictionary uses
  * Cache-misses

So to alleviate these pains, ~~take Advil daily~~ we'll start by turning the components into *stack-based* **value types** rather than the *heap-allocated* **reference types**. Perhaps in the future, I'll write something up about the difference between *value* and *reference* types, and the associated performance implications.

**Update: UH-OH, it looks as though I've misspoken. Boxing an int as an object still incurs a heap-allocation.** 

Second, we shall knock-out both of our last two bullet points by replacing our original `Dictionary<ushort, List<Component>>` with a fancy `List<object>`.

We'll use this list to store *all* of our components for *all* of our entities.
So the question may arise; "How does one actually distinguish which components belong to which entities?" The answer is actually fairly easy. We'll index where each entity's component list starts, and place this index at the start of our list. We'll access our index via *entity IDs*, that themselves represent indices, but this time, into our index.

Here's a **very, very rough** depiction of how our collection will store our things for us.
![rough-ecs](/resources/blog/entity-component-system-part3/roughecs.PNG)


## Why Not Use A List of Some Custom 'Entity' Class?
There is actually a reason (or two) for this.
### The first being cache-misses.
More than likely, if you use a something like a `List<Entity>`, each Entity instance will have a nested list of Components. So when you perform a search to find entities with specific components attached, you'd have to iterate via something akin to:
```cs
foreach(var entity in _entities)
{
  foreach(var component in entity.Components)
  {
    ...
  }
}
```
Basically what happens is that the processor will try to cache whichever array it's currently working on. But we're alternating between *_entities* and *entity.Components*, so the processor will be switching between the two in its cache. This is somewhat inefficient and tiresome for our CPU. 

### If you take an alternate route, another "problem" (subjective) arises.
Maybe to avoid lookups and cache-misses, you create concrete entity classes for each type of entity in your game, then each entity has public-facing members for each component it contains. So you'd have something like:
```cs
class PlayerEntity : EntityBase
{
  public PositionComponent { get; private set; }
  public PhysicsComponent { get; private set; }
  public TextureComponent { get; private set; }
  public PlayerComponent { get; private set; }
}
```
The only problem I have with this approach is that you lose some dynamic extensibility capabilities. The best you can do in terms of dynamic entity creation (ie, at runtime) is to use a DSL and have a transpiler translate your DSL data into concrete C# classes.


# The Implementation
So I'll just be going over the tid-bits I find interesting.
The code will be available on [my github](https://github.com/icecreamburglar) (in a repo called "hourglass") at some point.


