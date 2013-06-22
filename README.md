# Beer.json

An easy to read, simple representation of a brew recipe in JSON.

## why?

At time of writing, there is only one standard way of saving a beer recipe, and
it is not the prettiest thing in the world. Lots of angular brackets and such.

**Beer.json** is intended to do one thing, and one thing only. Represent a recipe
for a single brew.

## tenets

* One file = one recipe.
* Only relevant info. If you need to know your caryophyllene levels when pitching
  your hops, you might be better off looking at the angle-bracket solution.

## converters

Currently working on the first, beerxml -> beerjson converter. It's written with
node. Use it like this:

```
npm install -g beerjson
bxml2bjson sweet-recipe.json
```
