Steps to add a new asset

To add a new asset (crypto currency/token) the following needs to be created:

Recipe: a json file containing the data/properties for the asset *)
        Reference: hybridd/recipes/README-recipes.txt
        File: hybridd/recipes/asset.$NAME.json
Module: The server(node) side programmatic implementation of an asset **)
        Reference: hybridd/lib/README-modules.txt
        Directory: hybridd/modules/$NAME
Deterministic-Module: The client side programmatic implementation of an asset. This is kept seperate from the node to ensure privacy of client keys.
        Reference: module-deterministic/README.md
        Directory: modules-deterministic/modules/deterministic/$NAME

*) To add a new mode for an existing asset only a new recipe is required

**) Note that by using the Quarts module the server side code can be described in the recipe as well
        Reference: hybridd/lib/README-scheduler.txt


