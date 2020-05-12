
# The Entity-Component-System
The *Entity Component System* (We'll abbreviate it *ECS* for the sake of brevity) is designed to break away coupling that is naturally introduced when taking advantage of object-oriented-programming.
It achieves this by preferring to create *entities* with **composition** rather than **inheritance**.
It works by assigning various *Components* to each *Entity* - such that an entity is nothing more than a container for components - and then various *Systems* to act on said components. This in turn, makes the code much easier to maintain and expand upon.

Want to add hunger into a survival game?
  * Step 1: add a *HungerComponent* and assign it to the entity that represents the player.
  * Step 2: add a *HungerSystem* which monitors the *HungerComponent* and performs whatever actions are necessary and related to hunger. Maybe the system reaches out to a *HealthComponent* and depletes health. I don't know.

The beauty of an ECS, in my opinion, is the separation of logic and data it entails. Data is placed in components and logic is placed in systems.

-------------------------
#### Our implementation
Our implementation will have various nice little features.
These features include but are not limited to:
  * Message passing to/from systems.
  * Various extensions to increase convenience when working with entities.
  * ~~Dynamically loading components at runtime from a csharp-based DSL.~~
  *Scrapped. Prototyped build was cool, but suffered from the performance penalties of Reflection, and compiling c# code. Also it was overall long-winded to write against.*
  * Final phase where we optimize it (it'll need it badly, you'll see).

-------------------------


Let's walk through an example of where an ECS might be beneficial.
## OOP vs ECS Example\*
<sub>\*: There may be some bias towards the ECS in finding an example, since this post is about ECS.</sub>

So let's say that you have an `Actor` type which represents an NPC in an abstract way.
So maybe you have an `EnemyActor` and a `DogeActor`, both inheriting our parent `Actor` type. But, what would you do if you wanted a bad-guy doge as well?
In a perfect world, you could inherit from both `EnemyActor` **and** `DogeActor`, but that creates other issues and isn't actually possible as far as csharp's compiler is concerned anyway.

![oop-problem](/resources/blog/entity-component-system-part1/oop-problem.png)


"OK", you might think to yourself, you optimistic human you. Copy + Paste the code from both `EnemyActor` and `DogeActor` into a new `EnemyDogeActor` type. Well guess what. That's code duplication and it's not really a great thing to deal with. What happens when you change the behavior of an enemy? Now you've got to modify the behavior logic in **two** places. Both `EnemyActor` and `EnemyDogeActor`.

And you can't really inherit from just one of them and copy + paste the other into the new type, either. That won't work because then you'd have the behavior of a friendly, happy doggo when he's supposed to be snarling away at you with foam secreting from his mouth.

Don't take my word for it though, Robert C. Martin vents/rants about code duplication in probably every one of his books (great books by the way, you should give them a read if you haven't yet.)

# Implementation
Let's start off with a skeleton from which we can work in future posts.

## EntityManager.cs
The EntityManager is responsible for storing the entities and their components.
It should contain functions to act on the components each entity owns. Additionally, it'll have a messaging feature that systems can use to talk to each other without directly coupling together.

So, here's a bare-bones shell:
```cs
using System;
using System.Collections.Generic;
using System.Linq;

namespace GoldRush.Ecs
{
    static class Manager
    {
        static Manager()
        {
        }

        public static ushort CreateEntity()
        {
        }

        public static void DestroyEntity(ushort entityId)
        {
        }

        public static bool EntityIsAlive(ushort entityId)
        {
            return false;
        }

        public static T AddNewComponent<T>(ushort entityId, T component) where T : Component, new()
        {
            return new(T)
        }

        public static void AddComponent<T>(ushort entityId, T component) where T : Component
        {
        }

        public static void RemoveComponent<T>(ushort entityId) where T : Component
        {
        }

        public static void RemoveComponent(ushort entityId, string componentName)
        {
        }

        public static void RemoveComponent<T>(ushort entityId, T component) where T : Component
        {
        }
        
        public static void ClearComponents(ushort entityId)
        {
        }

        public static Component[] EnumComponents(ushort entityId)
        {
            return new Component[0];
        }

        public static T[] EnumComponents<T>(ushort entityId) where T : Component
        {
            return new T[0];
        }

        public static bool ContainsComponent<T>(ushort entityId) where T : Component
        {
            return false;
        }

        public static bool ContainsComponent(ushort entityId, string componentName)
        {
            return false;
        }

        public static T GetComponent<T>(ushort entityId) where T : Component
        {
            return default(T);
        }

        public static T GetComponent<T>(ushort entityId, string componentName) where T : Component
        {
            return default(T);
        }

        public static Component GetComponent(ushort entityId, Type componentType)
        {
            return null;
        }

        public static void PostMessage(ushort messageId, object data)
        {
        }

        public static void PostMessage(EntityMessage message)
        {
        }

        private static void ValidifyEntity(ushort entityId)
        {
        }
    }
}

```
There we go! That'll be a nice canvas we can play with.


## System.cs
I'm actually going to go ahead and supply the entire code for this one. It's extremely simple.

```cs
using System.Collections.Generic;

namespace Ecs
{
    abstract class System
    {
        protected List<ushort> _validEntites;

        protected System()
        {
            _validEntites = new List<ushort>();
        }

        public void EntityModified(ushort entityId)
        {
            bool valid = EntityValid(entityId);
            bool wasValid = _validEntites.Contains(entityId);
            
            if (valid && !wasValid)
            {
                _validEntites.Add(entityId);
            }
            if (!valid && wasValid)
            {
                _validEntites.Remove(entityId);
            }
        }

        public void EntityDestroyed(ushort entityId)
        {
            if (_validEntites.Contains(entityId))
            {
                _validEntites.Remove(entityId);
            }
        }

        public virtual void HandleMessage(EntityMessage message)
        {
        }

        protected abstract bool EntityValid(ushort entityId);
    }
}
```

Here we have various functions that our EntityManager will call into.

`EntityModified` gets called whenever an entity's composition gets changed. Either by way of adding components to or removing components. This then throws all "valid" entities (by their IDs) into a list that subclasses can take a look at.

`EntityDestroyed` ahem, this is called whenever we delete an entity.

`HandleMessage` right, so, this is called whenever another system calls the EntityManager's `PostMessage` function. Most systems will probably not care about any messages, so we'll leave this function virtual.

`EntityValid` is for subclasses to let us know if a given entity has the component make-up that this system cares about.

## Component.cs
Our Component base is even better.
```cs
namespace Ecs
{
    public abstract class Component
    {
        public ushort OwnerId { get; private set; }

        public virtual string ComponentName => this.GetType().Name;

        public void SetOwnerId(ushort newOwner)
        {
            OwnerId = newOwner;
        }
        
        public virtual Component Set(string property, object value)
        {
            return this;
        }

        public virtual T Get<T>(string property)
        {
            return default(T);
        }

        public virtual object Get(string property)
        {
            return null;
        }

        public abstract bool CanSerialize { get; }

        public abstract void Deserialize(byte[] data);
        public abstract byte[] Serialize();
    }
}
```
The only things in this type that might requiring explaining would be the `Set` and `Get` functions. These will be used and explained later on, I promise.

## EntityMessage.cs
```cs
namespace Ecs
{
    class EntityMessage
    {
        public ushort MessageId { get; private set; }
        public object Data { get; private set; }

        public EntityMessage(ushort messageId)
            : this(messageId, null)
        {

        }

        public EntityMessage(ushort messageId, object data)
        {
            MessageId = messageId;
            Data = data;
        }
    }
}
```
...*I'm not even going to actually explain this to you*... But it could maybe become a struct if you wanted it to.

# Conclusion
Thus we have completed the first leg of our trip.
We've covered enough to keep the compiler from crying to you, and probably enough for you to finish it yourself at this point.

Though I shall not falter; But I will post probably two more posts on this subject. I'm thinking one where we finish the EntityManager and another where we write in dynamic, runtime-loading, really cool, components that are defined in a C# DSL we'll implement with Roslyn's scripting API *.

*: That was scrapped.

Oh, and then maybe another post where we tie it all up in an example.
So I guess that's three more posts.

As an excersise, why not replace everything applicable with `structs` and use `ref` everywhere to reduce heap allocations. It might be interesting to compare the performance of both an implementation passing references to Stack values around and an implementation that just uses Heap (allocations and) references. Then one could decided on a case-by-case basis which would be better for each project, given how much data you play around with.

You should also check out the [The ECS's entry](http://gameprogrammingpatterns.com/component.html) in the free online book, [**GameProgrammingPatterns** by *Robert Nystrom*](http://gameprogrammingpatterns.com)
