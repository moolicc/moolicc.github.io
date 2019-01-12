Title: Creating an Entity Component System in c# - Part 2
Lead: |
    We shall explore the creation and usage of an Entity-Component-System in a couple posts.
    In this post, we'll talk about the EntityManager.
Published: 5/13/2018
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
# The Entity Manager
Hello, and welcome to the second episode of our 3-part journey. Today we will discuss the fairly straight-forward implementation of the EntityManager type.

It really is nothing novel. I just didn't want to bog down the first post with all of the code from the EntityManager.cs source.

Let's begin, shall we?

# Class Declaration and Fields
So, first things must come first else they wouldn't be denoted *first things*.

My implementation is declared as `static`, but you could easily not do that if that's not something you would like to do.

Now onto the `fields` part of this section.
```cs
public static List<EntitySystem> Systems { get; private set; }

private static Dictionary<ushort, List<Component>> _entities;
private static Queue<ushort> _recycledIds;
private static ushort _lastId;
```
Those are all the fields we'll need to make this thing work.


---
### List\<EntitySystem\> Systems

First we have our `List<EntitySystem>`. This keeps track of all the Systems that operate on Entities. It's necessary for the EntityManager to know about them so that we can issue notifications to each system.

Then we have some private fields.


---
### Dictionary\<ushort, List\<Component\>\> _entities

Let's talk about the *_entities* field.
This field keeps up with each active entity in the scene. Each entity is assigned a unique, 16-bit ID and coupled with each component that makes up the entity.

**I know it's ugly, but don't worry about the use of nested generics.** Specifically nesting the List\<T\> within the Dictionary\<T\>. What we'll do when we add new entries is actually use that `List<T>` constructor that doesn't get a ton of love who's signature is something like `List<T>(int initialCapacity)` to give us roughly the same performance as if we were to use a primitive array here.

I'll explain all this in just a moment.


---
### Queue\<ushort\> _recycledIds

Aha! That brings us to our *Queue* of *Recycled Entity IDs*.
Each time we delete an entity, we'll store its ID in this queue.
Then when we create another entity, we'll pop an ID from this queue instead of leaving a "hole" in our otherwise continuous count of IDs. If *that* doesn't sell the idea to you, then the re-use of IDs to avoid running out of available IDs (ahem, that's a big number, or 65535 to be exact) for as long as possible might.

You should probably make this a `ConcurrentQueue<ushort>` if you care about multithreading and stuff.


---
### ushort _lastId

This one is, well...
This one keeps track of the ID that belongs to the **previously created entity**.
There's not much more to say about this little field though.

---
## A Touch of List\<T>'s Internals.

So I guess I promised I'd say something about this.

It's pretty straightforward actually. So internally, the List, as you might have guessed, uses an Array of type T. It also has an index which points to the next empty position in the array that is used whenever you invoke the `List.Add` function.

Whenever this index exceeds the length of the array, a new array is created with an appropriate length - that is, `old length × 2` - and an `Array.Copy` operation is performed to move the contents of the old, short array into the new, longer array.

So, by setting the initial capacity to a number we probably won't exceed (and if we do, it's OK), we're instructing the list to set the backing-array's initial length to a specific value. The array won't need to be resized unless we do happen to exceed the initial capacity value we throw at it.

There is therefore, a minimal-to-no performance hit when using a `List<T>` in this way, so long as you don't do anything more than adding/removing items.

...LINQ operations are still slow... (But we'll use them anyway in the future)

Check out the [source for List\<T>](https://referencesource.microsoft.com/#mscorlib/system/collections/generic/list.cs)

**Side-note**: `RemoveAt` is more effecient that `Remove`. Remove internally performs an `IndexOf` followed by a `RemoveAt` call itself.


# Functions
So there are...A few of these to cover.
The good news is, I'll mostly be not having to explain them to you.


### Constructor
```cs
static Manager()
{
    Systems = new List<EntitySystem>();
    _entities = new Dictionary<ushort, List<Component>>(); 
    _recycledIds = new Queue<ushort>();
    _lastId = 0;
}
```
Ah yes, our beloved static constructor. This just instantiates all of our previously explored fields to avoid ~~our fate brought on by Thanos~~ NullReferenceExceptions ~~caused by Thanos' snapping fingers~~.
Wait, what? Don't worry about it. I didn't hear anything.


### Creation/Deletion of entities

```cs
public static ushort CreateEntity()
{
    if (_lastId + 1 >= ushort.MaxValue && _recycledIds.Count == 0)
    {
        //LOG IT
        _lastId = 0;
    }

    ushort idToUse;
    if (_recycledIds.Count > 0)
    {
        //LOG IT
        idToUse = _recycledIds.Dequeue();
    }
    else
    {
        _lastId++;
        idToUse = _lastId;
    }

    if (_entities.ContainsKey(idToUse))
    {
        _entities[idToUse].Clear();
        foreach (var system in Systems)
        {
            system.EntityDestroyed(entityId);
        }
    }
    else
    {
        _entities.Add(idToUse, new List<Component>(5));
    }
    //LOG IT
    return _lastId;
}
```

First of all, you probably didn't come to see the use of my [Logging Library](https://github.com/icecreamburglar/waterlogged). Though I supposed there's always a *non-zero probability that you did*. But anyway, I just replaced calls to the logging library with a loving comment that yells "LOG IT" at you.

But onward to the code! And I'm not going to repost it in bits-and-pieces; you'll just have to scroll back up if you forget it.

Naturally we want to make sure there is an ID available for consumption.
So if we're out of IDs and there are no IDs in our recycle pool, we roll-over our `_lastId` to 0.

Next up, we check our `_recycledIds` queue, if it's got something in it, we'll go ahead and pull an ID from there. Otherwise, we just increment `_lastId` and use that.

To cover the event that we may have rolled-back to 0, we want to make sure the `_entities` dictionary doesn't already contain our selected ID for our new entity. If it does, no matter; just clear the components list, notify the Systems what happened, and roll with it.
If it doesn't contain our ID and we're genuinely created a new entry, just create a new entry.

Finally, we return the ID of our new entity to the caller.

---

```cs
public static void DestroyEntity(ushort entityId)
{
    //LOG IT
    foreach (var system in Systems)
    {
        system.EntityDestroyed(entityId);
    }

    _entities.Remove(entityId);
    _recycledIds.Enqueue(entityId);
    //LOG IT
}
```

All we do here is notify each system that we're terrible people and purging an entity and then removing the desired entity.
After that we just mark the entity for recyclation (+1 new coined word) and log a message.


### EntityIsAlive
```cs
public static bool EntityIsAlive(ushort entityId)
{
    return _entities.ContainsKey(entityId);
}
```
Here we see one of those that doesn't deserve explanation, nor is it really profound. Yet we'd surely miss it if it wasn't present.

### Adding and Removing Components
```cs
public static void AddComponent<T>(ushort entityId, T component) where T : Component
{
    if (component.OwnerId != 0)
    {
        //LOG IT AND MAYBE EXCEPTION TOO
        return;
    }
    component.SetOwnerId(entityId);
    _entities[entityId].Add(component);
    ValidifyEntity(entityId);
}
```

I'd say this one is pretty easy to grok also.
We check to ensure the component doesn't have an owning entity already, add the component to the entity, and then notify the systems that the entity was modified.

---
```cs
public static T AddNewComponent<T>(ushort entityId, T component) where T : Component, new()
{
    T value = new T();
    AddComponent(entityId, value);
    return value;
}
```
This is just a convenience function.

---

Let's kill not two, but three birds with one stone here.
```cs
public static void RemoveComponent<T>(ushort entityId) where T : Component
{
    for (int i = 0; i < _entities[entityId].Count; i++)
    {
        if (_entities[entityId][i] is T)
        {
            _entities[entityId][i].SetOwnerId(0);
            _entities[entityId].RemoveAt(i);
            ValidifyEntity(entityId);
            return;
        }
    }
    //LOGIT
}

public static void RemoveComponent(ushort entityId, string componentName)
{
    for (int i = 0; i < _entities[entityId].Count; i++)
    {
        if (_entities[entityId][i].ComponentName == componentName)
        {
            _entities[entityId][i].SetOwnerId(0);
            _entities[entityId].RemoveAt(i);
            ValidifyEntity(entityId);
            return;
        }
    }
    //LOGIT
}

public static void RemoveComponent<T>(ushort entityId, T component) where T : Component
{
    if (component.OwnerId != entityId)
    {
        //LOG IT
        return;
    }
    component.SetOwnerId(0);
    _entities[entityId].Remove(component);
    ValidifyEntity(entityId);
}
```

Both of the first two do the same thing, with different comparisons.
They iterate over the desired entity's components until they find the one they're looking for. They then remove the component and exit the function, optionally logging it if they don't find what they're looking for.

The third one is even easier; it just takes in the component the user is trying to remove as a parameter.

---
```cs
public static void ClearComponents(ushort entityId)
{
    //LOG IT

    foreach (var component in _entities[entityId])
    {
        component.SetOwnerId(0);
    }
    
    _entities[entityId].Clear();

    foreach (var system in Systems)
    {
        system.EntityModified(entityId);
    }
}
```
This guy clears all components from an entity. Not much worth explaining here.

### Enumerating Components, Contains Functions, and Component Retrieval

All of these probably don't deserve explanation. So I'll just put them here for you to copy + paste or whatever.

```cs
public static Component[] EnumComponents(ushort entityId)
{
    return _entities[entityId].ToArray();
}

public static T[] EnumComponents<T>(ushort entityId) where T : Component
{
    return _entities[entityId].OfType<T>().ToArray();
}

public static bool ContainsComponent<T>(ushort entityId) where T : Component
{
    return _entities[entityId].Any(c => c is T);
}

public static bool ContainsComponent(ushort entityId, string componentName)
{
    return _entities[entityId].Any(c => c.ComponentName == componentName);
}

public static T GetComponent<T>(ushort entityId) where T : Component
{
    return (T)_entities[entityId].FirstOrDefault(c => c is T);
}

public static T GetComponent<T>(ushort entityId, string componentName) where T : Component
{
    return (T)_entities[entityId].FirstOrDefault(c => c.ComponentName == componentName);
}

public static Component GetComponent(ushort entityId, Type componentType)
{
    return _entities[entityId].FirstOrDefault(c => c.GetType() == componentType);
}
```

### System Notifications

```cs
public static void PostMessage(ushort messageId, object data)
{
    PostMessage(new EntityMessage(messageId, data));
}

public static void PostMessage(EntityMessage message)
{
    //LOG ME TOO
    foreach (var system in Systems)
    {
        system.HandleMessage(message);
    }
}
```
All these two blokes do is relay a message to each system.

---
```cs
private static void ValidifyEntity(ushort entityId)
{
    foreach (var system in Systems)
    {
        system.EntityModified(entityId);
    }
}
```

This one is similarly straight-forward and simply notifies each system that an entity has been modified in some way. Each system then decides for itself whether or not it is interested in the modified entity.


# Conclusion
Approximately 380 lines later and we have a completed EntityManager.
It's probably been exhausting for you to have to read through it all, as I've not posted a link to the github repo where you can go grab it all without the extraneous fluff of reading a blog. But that's OK. I'm bettering you as a human. With each post you read you shall gain a little bit of patience.

...Maybe