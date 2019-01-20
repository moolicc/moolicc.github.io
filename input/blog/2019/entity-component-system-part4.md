Title: Creating an Entity Component System in c# - Revisit
Lead: |
    We shall explore the creation and usage of an Entity-Component-System in a couple posts.
    In this post, we'll throw all the previous posts away and actually write an ECS skeleton.
Published: 1/12/2019
Description: Today let's dive into what's hopefully a nice and elegant API to consume as well as fairly-efficient code for an Entity Component System framework.
Tags:
 - C#
 - MonoGame
 - Game Development
 - Design Pattern
---
# Revisit
Clear your mind of what you've read here from previous posts in this overly long-winded series.
Shortly after I wrote the last post, I realized that some of the stuff I said was not entirely correct.
Specifically, we were still stacking up the HEAP allocations because
A) Value-type implementations of interfaces are boxed
B) an `int` stored as an `object` is boxed

However, We'll still follow the same concept for data locality. We'll use a 1-dimensional array to store entities via their IDs and components.
We'll use the fore-front of our array to index into entities' components.
A key difference, is that this time, our list's declaration looks like `List<EntityItem> _entities;`.
This brings us to our first point.

## Terminology I'll (try) to follow
Let's just go over the wording I'll use to make sure everything I type here is crystal-clear.
 * An *entity index* or *entity pointer* is the item within our entities list that holds an index to the beginning of an entity's component list
 * An *entity ID* is an index that corresponds to an entity index within the entities list
 * An *entity* is the sub-list of components within our entities list that represents an entity in the caller's game or simulation.

Here's a little something I drew-up to hopefully help visualize. It also might be too hard to see, I'm one of the unlucky folks who doesn't have 20 cameras
on my phone to take clear pictures.
Where *E* is our list of entities.

![rough-ecs](/assets/blog/entity-component-system-part4/ecs.jpg)

Note that the code itself might not fully conform to these terms. Hopefully, it'll be concise enough to not even matter though.

# Storing Numerical IDs Without Boxing
OK, so the title of this paragraph is a tad misleading. We'll in actuality be abstracting both entity indices and components, but this time we'll do so
via our own struct, which I've aptly named `EntityItem`. However at least here, we know our 32-bit integer ID won't be stored in the HEAP.

An instance of an EntityItem either represents an entity's index or an actual concrete component.
The EntityItem type contains most importantly, two fields. One of type ComponentBase (named "Component"), and another of type int (named "EntityIndex"). We've also got a bool for IsAlive to determine if the entity has been removed or not. And finally, I've thrown in a handy bool, *IsComponent*.

It's probably worth noting that all of these are literally **fields** and not **properties.**. The purpose of this
is that fields are stored as *references* and properties behave more like *values* (properties are a tad more complicated than that as they really
just wrap around private fields themselves anyway). This is important because if our Component field was accessed like a value, then changes made to
the component in the code that consumes are ECS wouldn't modify the actual component we're storing, but in essence a copy of it.
Additionally, I've thrown in a couple of constructor overloads to make instantiating this struct more convinient.
`public EntityItem(int entityIndex)` and `public EntityItem(ComponentBase component)`. Though both of these just call into an
private constructor that looks like `private EntityItem(int entityIndex, ComponentBase component)` that sets everything up for us.

# The Entity Manager
Our entity manager is very similar to the previous idea, having a single list containing components bound to numerical entity IDs.
Also like I mentioned in the previous post, we'll set our list's initial capacity to go ahead and have its internal array allocate a chunk of memory.
If we don't do this, then as we add to the list it'll contantly have to resize its underlying array.
In fact, the contructor's body is only three lines, and is responsible only for creating a list of systems to manager, our entity list,
and setting our entity ID counter to 0. It looks a little something like this
```cs
public EntityManager(int entityCount)
{
  Systems = new List<SystemBase>();
  _entities = new List<EntityItem>(entityCount * COMPONENTS_PER_ENTITY);
  _deadIds = new Queue<int>(entityCount);
  _nextId = 0;
}
```
`COMPONENTS_PER_ENTITY` is merely an estimated number of components every entity will contain. At the time of writing this, it's set to 6.

## The Code
I'll try to keep some of my breath in my lungs and only mention the interesting/important bits in here, but I'll leave a link to the code further on.
Certainly most of the code is boilerplate, and there's a lot of duplication because within the (dare I call them) algorithms I use in each operation
(remove, add, find, etc) there are small changes on singular lines to optimize for that specific operation we're performing at the time.

OK, let's begin.

### Private utilities
One thing we'll be doing a lot of is identifying if an *EntityItem* at a given index within *_entites* is an entity or a component.
That being said, we can save some time and ware on our fingers if we use a helper function, like the following
```cs
private bool IsEntityPointer(int entityId, out EntityItem entityItem)
{
  entityItem = EntityItem.Empty;
  if (entityId < 0
      || entityId >= _entities.Count
      || _entities[entityId].IsComponent)
  {
      return false;
  }

  entityItem = _entities[entityId];
  return true;
}
```
What we're doing here, is merely checking the given index to ensure it is within our *_entites* bounds and then checking the item at that index
to see if it's an entity index or entity. We also go ahead and return the entityitem (assuming it was an entity index) in the form of our `out EntityItem entityItem`.

Furthermore, we'll be performing quite a few operations upon entity pointers, so let's go ahead and create a helper function to aid with that.
```cs
private void IterateEntityPointers(int startingId, Action<int, EntityItem> action)
{
  for (int i = startingId; i < _entities.Count && IsEntityPointer(i, out var item); i++)
  {
      action(i, item);
  }
}
```
This will allow us to loop over entity pointers without throwing the exact same for loop everywhere. It's important to note
that this loop stops iterating as soon as we hit an entity's component list.

I think this is best explained through an example of use, so here goes
```cs
IterateEntityPointers(0, (i, e) =>
  {
    Console.WriteLine($"Entity at ID {i}: {e}");
  });
```

Similarly, we also have one to iterate over an entire entity.
```cs
private void IterateEntity(EntityItem entity, int entityId, Func<int, EntityItem, bool> action)
{
  int endIndex = _entities.Count;
  if(IsEntityPointer(entityId + 1, out var nextEnt))
  {
    endIndex = nextEnt.EntityIndex;
  }
  for (int i = entity.EntityIndex; i < endIndex; i++)
  {
    if(action(i, _entities[i]))
    {
      break;
    }
  }
}
```
We also throw in the necessary logic to ensure we don't overflow into another entity (*see: endIndex*).
This one is a tad bit different than the former in that it allows the calling code to break out of the loop early if `action` returns *true*.

### Public appearances
Now that we've got all of our little helpers out of the way, let's go ahead and cover the 6 basic operations a caller might do
  1. Creating an entity
  2. Destroying an entity
  3. Adding a component to an entity
  4. Removing a component from an entity
  5. Checking for the existance of a component within an entity
  6. Iterating an entity's components

Without too much fanfaire, I'm just going to give you a good shove off the proverbial diving board.

#### Creating an entity
First, it's rather important to have to ability to add an entity to our thing here.
We'll do that via a fancy, albeit blandly named *CreateEntity* function.
```cs
public int CreateEntity()
{
  //Check for a recyclable ID first.
  if(_deadIds.Count != 0)
  {
    int id = _deadIds.Dequeue();
    var ent = _entities[id];
    ent.IsAlive = true;
    _entities[id] = ent;
    return id;
  }

  //Increment each previous entity's starting index.
  for (int i = 0; i < _nextId; i++)
  {
    var ent = _entities[i];
    ent.EntityIndex++;
    _entities[i] = ent;
  }
  //Add this entity in with a starting index pointing to the end
  //of the array.
  _entities.Insert(_nextId, new EntityItem(_entities.Count + 1));
  return _nextId++;
}
```
The comments hopefully make this snippet self-explanatory, but I'll show you the highlights anyway.
First of all, we quite simply check for dead entities to revive for use. But if there's not an entity we can breath life into again, we have
to take a few precautions to add a new entity pointer.
So if we're going to be adding in an entity pointer **after** other entity pointers but **before** entities actually begin then it's pretty
important to inform the previous entity pointers that we're going to do this. Otherwise, their indices won't be correct as our list will grow
without them being aware. *We'll unfortunately have to do this until the machine learning train creates self-aware objects.*

#### Destroying an entity
Next up, we should take a look at the case where a caller might be a monster and desire the destruction of an entity.
So I guess we should also include a method of the removal of entities.

<aside>😬<br>I actually forgot to implement this until writing this post. Before this time, entities overpopulated the world, causing mass-chaos.</aside>

```cs
public void DestroyEntity(int entityId)
{
  //Sanity check to make sure the passed entityId is valid.
  if (!IsEntityPointer(entityId, out var entItem) || !entItem.IsAlive)
  {
    throw new InvalidOperationException("The specified entity does not exist.");
  }

  //Find the end index of the entity's component list.
  int endIndex = _entities.Count;
  if(IsEntityPointer(entityId + 1, out var nextEntityItem))
  {
    endIndex = nextEntityItem.EntityIndex;
  }

  //Hold the actual number of components this entity owns.
  int componentCount = endIndex - entItem.EntityIndex;

  //Decrement all following entity pointers to account for the removal
  //of the components from the current entity.
  IterateEntityPointers(entityId + 1, (i, e) =>
    {
      e.EntityIndex -= componentCount;
      _entities[i] = e;
    });

  //Remove the entity and mark the pointer as dead.
  _entities.RemoveRange(entItem.EntityIndex, componentCount);
  entItem.IsAlive = false;
  _entities[entityId] = entItem;
  _deadIds.Enqueue(entityId);
}
```
OK, that one is a tad bit longer than we're used to. But we'll be fine if we break it down.
First, as the comment states, we perform a check to ensure the entity is currently alive and well.
We'll see checks like these throughout, so I'll probably not explain them going on.

The next thing we do is find out where this entity ends, we do this to find the count of components this entity contains.
We then inform all following entities about the removal of our components. If we don't do this, other entities won't know
that the indices in the list are changing and we could (and would) have descprepancies.

Finally, we simply remove the components and mark the entity ID as dead.

#### Adding a component to an entity
Now that we know how to add and remove entire entities, what's say we go ahead and look at the code we use to add a component
to an entity. It's worth noting that this doesn't *add* a component to the end of an entity, but rather this will *push* a component
into the first position of an entity.

```cs
public void PushComponent(int entityId, ComponentBase component)
{
    //Sanity check to make sure the passed entityId is valid.
    if (!IsEntityPointer(entityId, out var entItem) || !entItem.IsAlive)
    {
        throw new InvalidOperationException("The specified entity does not exist.");
    }

    //If there are entities after this one, increment their starting indices.
    IterateEntityPointers(entityId + 1, (i, e) =>
    {
        e.EntityIndex++;
        _entities[i] = e;
    });

    //Add the component under the entity's area.
    component.OwnerId = entityId;
    _entities.Insert(entItem.EntityIndex, new EntityItem(component));

    //Notify the systems that an entity has been modified.
    RefreshSystems(entityId);
}
```
This code should be fairly self-explanatory.
The first interesting thing we do is notify following entity pointers that they should increment by one to account for the new component going in
ahead of their entities.
Second, we set the component's owner and add it in.
Finally, we inform all systems that an entity has been modified.

#### Removing a component
The removal of a component is exactly the same as the addition of a component, but of course in reverse.
```cs
public void RemoveComponent(int entityId, ComponentBase component)
{
    //Sanity check to make sure the passed entityId is valid.
    if (!IsEntityPointer(entityId, out var entItem) || !entItem.IsAlive)
    {
        throw new InvalidOperationException("The specified entity does not exist.");
    }

    //Find the index of the component.
    int componentIndex = -1;
    IterateEntity(entItem, entityId, (i, c) =>
    {
        if(c.Component == component)
        {
            c.Component.OwnerId = -1;
            componentIndex = i;
            return true;
        }
        return false;
    });
    
    //Sanity check to make sure the component exists.
    if(componentIndex == -1)
    {
        throw new InvalidOperationException("The specified entity does not contain that component.");
    }

    //If there are entities after this one, decrement their starting indices.
    IterateEntityPointers(entityId + 1, (i, e) =>
    {
        e.EntityIndex--;
        _entities[i] = e;
    });

    //Remove the component
    _entities.RemoveAt(componentIndex);

    //Notify the systems that an entity has been modified.
    RefreshSystems(entityId);
}
```
The first thing worth mentioning that we're doing here is finding out where the component actually lives in the larget _entities list.
While we're at that search, we go ahead and set the component's owner to -1 to signify that it's no longer loved enough to have an owner.

The next thing we do - and this is a bit complicated so please, try to stay with me - the next thing we do is an error check to
ensure that the component was actually found.

Finally, we once again inform other entity pointers about this change, remove the component, and notify systems there's been a modification
to our entity.

#### Checking for the extistance of a component
Honestly I'm not even sure I can fluff this up a great deal. It's really quite simple and the code is mostly self-explanatory.
But I'd say I'm doing a fantastic job of jamming as many characters as I can into this section before even showing you the code.

Without further ado, I will not copy + past the code into this document for your viewing.
```cs
public bool ContainsComponent(int entityId, ComponentBase component)
{
    //Sanity check to make sure the passed entityId is valid.
    if (!IsEntityPointer(entityId, out var entItem) || !entItem.IsAlive)
    {
        throw new InvalidOperationException("The specified entity does not exist.");
    }

    //Check if the component exists.
    bool foundComponent = false;
    IterateEntity(entItem, entityId, (i, c) =>
    {
        if (c.Component == component)
        {
            foundComponent = true;
            //return true to inform IterateEntity to stop iterating.
            return true;
        }
        return false;
    });

    //Return the results.
    return foundComponent;
}
```


#### Iterating over an entity's components

...I won't even try for this one...
```cs
public IEnumerable<ComponentBase> GetComponents(int entityId)
{
    //Sanity check to make sure the passed entityId is valid.
    if (!IsEntityPointer(entityId, out var entItem) || !entItem.IsAlive)
    {
        throw new InvalidOperationException("The specified entity does not exist.");
    }

    //Iterate until necessary and yield return the components.
    int endIndex = _entities.Count;
    if (IsEntityPointer(entityId + 1, out var nextEnt))
    {
        endIndex = nextEnt.EntityIndex;
    }
    for (int i = entItem.EntityIndex; i < endIndex; i++)
    {
        yield return _entities[i].Component;
    }
}
```
The only thing here to note is the `yield` statement. If you're not sure what that means, then honestly google it.
There are plenty of smarter people who are far better at explaining things than me that have written about it.
Besides, probably the best advice you can garner from the internet is actually how to google.

### Other code
There's plenty of other code you can poke around at in the github.
I've included plenty of overloads to make the life of a consumer of this API easy and painless.


# Conclusion
Whew! After nearly a year, I've finally gotten around to completing an ECS and writing about it.
The Entity Component System is a fantastic tool to have on your belt, and honestly it's a joy to work with.
Writing one up can be kind of boiler-plate, but I find it fun to try and make it unique and at least some-what performance friendly.

I've thrown the full code up on my [github](https://github.com/jmikew/hourglass).
So please, go poke around, have some fun, and let me know how it goes!