from typing import Dict, Any, Optional
from app.models.schemas import TaxonomyClass, RarityTier, DangerLevel

# Curated taxonomic mapping for ImageNet synsets and species keywords
# Maps ImageNet synset labels to accurate biological classification and Gotcha metadata.
SPECIES_TAXONOMY_MAP: Dict[str, Dict[str, Any]] = {
    # -------------------------------------------------------------
    # ARACHNIDA (Spiders, Scorpions, Ticks, Harvestmen)
    # -------------------------------------------------------------
    "tarantula": {
        "common_name": "Tarantula",
        "scientific_name": "Theraphosidae",
        "taxonomy_class": TaxonomyClass.ARACHNIDA,
        "rarity": RarityTier.RARE,
        "danger_level": DangerLevel.MILD,
        "habitat": "Rainforests, deserts, and burrows worldwide",
        "fun_fact": "Tarantulas can flick urticating hairs from their abdomen as a defensive projectile when threatened.",
        "diet": "Carnivorous (insects, small mice, frogs)",
    },
    "wolf spider": {
        "common_name": "Wolf Spider",
        "scientific_name": "Lycosidae",
        "taxonomy_class": TaxonomyClass.ARACHNIDA,
        "rarity": RarityTier.UNCOMMON,
        "danger_level": DangerLevel.MILD,
        "habitat": "Grasslands, forests, and suburban gardens",
        "fun_fact": "Unlike most spiders, wolf spiders do not spin webs; they actively stalk and ambush prey on foot.",
        "diet": "Insects and other arthropods",
    },
    "black widow": {
        "common_name": "Black Widow Spider",
        "scientific_name": "Latrodectus mactans",
        "taxonomy_class": TaxonomyClass.ARACHNIDA,
        "rarity": RarityTier.RARE,
        "danger_level": DangerLevel.VENOMOUS_DANGEROUS,
        "habitat": "Dark shelters, woodpiles, and stone crevices",
        "fun_fact": "Their venom contains latrotoxin, which is 15 times stronger than rattlesnake venom per drop.",
        "diet": "Insects trapped in irregular tangled webs",
    },
    "barn spider": {
        "common_name": "Orb Weaver Spider",
        "scientific_name": "Araneus cavaticus",
        "taxonomy_class": TaxonomyClass.ARACHNIDA,
        "rarity": RarityTier.COMMON,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Barns, eaves, gardens, and dense trees",
        "fun_fact": "Orb weavers eat and rebuild their circular web almost every night to recycle the silk proteins.",
        "diet": "Flying insects, flies, moths",
    },
    "garden spider": {
        "common_name": "Yellow Garden Spider",
        "scientific_name": "Argiope aurantia",
        "taxonomy_class": TaxonomyClass.ARACHNIDA,
        "rarity": RarityTier.COMMON,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Sunny fields, gardens, and tall weeds",
        "fun_fact": "They weave a distinctive zigzag silk pattern called a stabilimentum down the center of their web.",
        "diet": "Grasshoppers, bees, wasps, and flies",
    },
    "scorpion": {
        "common_name": "Scorpion",
        "scientific_name": "Scorpiones",
        "taxonomy_class": TaxonomyClass.ARACHNIDA,
        "rarity": RarityTier.RARE,
        "danger_level": DangerLevel.VENOMOUS_DANGEROUS,
        "habitat": "Deserts, scrublands, and tropical caverns",
        "fun_fact": "All known scorpions glow vibrant cyan-green under ultraviolet (black) light due to fluorescent compounds in their cuticle.",
        "diet": "Insects, spiders, small lizards",
    },
    "tick": {
        "common_name": "Wood Tick",
        "scientific_name": "Ixodida",
        "taxonomy_class": TaxonomyClass.ARACHNIDA,
        "rarity": RarityTier.COMMON,
        "danger_level": DangerLevel.MILD,
        "habitat": "Tall grasses, brush, and mammalian trailways",
        "fun_fact": "Ticks are not insects; they are arachnids with 8 legs in their adult stage, closely related to mites.",
        "diet": "Blood of mammals and birds",
    },

    # -------------------------------------------------------------
    # INSECTA (Beetles, Butterflies, Ants, Mantises, Bees, etc.)
    # -------------------------------------------------------------
    "monarch": {
        "common_name": "Monarch Butterfly",
        "scientific_name": "Danaus plexippus",
        "taxonomy_class": TaxonomyClass.INSECTA,
        "rarity": RarityTier.UNCOMMON,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Fields, meadows, and milkweed patches across the Americas",
        "fun_fact": "Monarchs undertake an incredible multi-generational migration covering up to 3,000 miles every autumn.",
        "diet": "Floral nectar (caterpillars feed exclusively on milkweed)",
    },
    "monarch butterfly": {
        "common_name": "Monarch Butterfly",
        "scientific_name": "Danaus plexippus",
        "taxonomy_class": TaxonomyClass.INSECTA,
        "rarity": RarityTier.UNCOMMON,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Fields, meadows, and milkweed patches across the Americas",
        "fun_fact": "Monarchs undertake an incredible multi-generational migration covering up to 3,000 miles every autumn.",
        "diet": "Floral nectar",
    },
    "swallowtail": {
        "common_name": "Tiger Swallowtail Butterfly",
        "scientific_name": "Papilio glaucus",
        "taxonomy_class": TaxonomyClass.INSECTA,
        "rarity": RarityTier.COMMON,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Woodlands, river valleys, and suburban parks",
        "fun_fact": "Their name comes from the tail-like extensions on their hind wings resembling the fork-tailed swallow bird.",
        "diet": "Nectar from wild cherry, lilac, and clover",
    },
    "mantis": {
        "common_name": "Praying Mantis",
        "scientific_name": "Mantodea",
        "taxonomy_class": TaxonomyClass.INSECTA,
        "rarity": RarityTier.UNCOMMON,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Temperate forests, gardens, and agricultural fields",
        "fun_fact": "Praying mantises are the only insects in the world that can rotate their head 180 degrees.",
        "diet": "Insects, small frogs, and even hummingbirds",
    },
    "dragonfly": {
        "common_name": "Dragonfly",
        "scientific_name": "Anisoptera",
        "taxonomy_class": TaxonomyClass.INSECTA,
        "rarity": RarityTier.COMMON,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Wetlands, ponds, streams, and lakes",
        "fun_fact": "Dragonflies are among nature's most successful apex predators, with a 95% hunt success rate.",
        "diet": "Mosquitoes, midges, and small flying insects",
    },
    "damselfly": {
        "common_name": "Damselfly",
        "scientific_name": "Zygoptera",
        "taxonomy_class": TaxonomyClass.INSECTA,
        "rarity": RarityTier.COMMON,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Freshwater margins, slow-moving creeks",
        "fun_fact": "Unlike dragonflies which rest with wings outstretched, damselflies fold their wings back along their abdomen.",
        "diet": "Aphids and tiny gnats",
    },
    "honeybee": {
        "common_name": "Western Honey Bee",
        "scientific_name": "Apis mellifera",
        "taxonomy_class": TaxonomyClass.INSECTA,
        "rarity": RarityTier.COMMON,
        "danger_level": DangerLevel.MILD,
        "habitat": "Hives, meadows, orchards, and floral gardens",
        "fun_fact": "A honeybee performs a complex 'waggle dance' inside the hive to communicate the exact direction and distance of flowers.",
        "diet": "Pollen and nectar",
    },
    "bee": {
        "common_name": "Bumblebee",
        "scientific_name": "Bombus",
        "taxonomy_class": TaxonomyClass.INSECTA,
        "rarity": RarityTier.COMMON,
        "danger_level": DangerLevel.MILD,
        "habitat": "Alpine meadows, gardens, and woodlands",
        "fun_fact": "Bumblebees practice 'buzz pollination' by vibrating their flight muscles at resonant frequencies to release deep pollen.",
        "diet": "Pollen and nectar",
    },
    "ladybug": {
        "common_name": "Seven-spotted Ladybug",
        "scientific_name": "Coccinella septempunctata",
        "taxonomy_class": TaxonomyClass.INSECTA,
        "rarity": RarityTier.COMMON,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Crops, gardens, hedges, and deciduous woodlands",
        "fun_fact": "A single ladybug can consume up to 5,000 harmful aphids during its lifetime.",
        "diet": "Aphids, scale insects, and mites",
    },
    "ground beetle": {
        "common_name": "Ground Beetle",
        "scientific_name": "Carabidae",
        "taxonomy_class": TaxonomyClass.INSECTA,
        "rarity": RarityTier.COMMON,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Soil, leaf litter, under stones and logs",
        "fun_fact": "Many ground beetles can spray noxious defensive chemicals to deter birds and larger predators.",
        "diet": "Slugs, caterpillars, and grubs",
    },
    "rhino beetle": {
        "common_name": "Rhinoceros Beetle",
        "scientific_name": "Dynastinae",
        "taxonomy_class": TaxonomyClass.INSECTA,
        "rarity": RarityTier.RARE,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Tropical rainforests and rotting timber",
        "fun_fact": "Rhinoceros beetles are among the strongest creatures proportional to body weight, lifting up to 850 times their own mass!",
        "diet": "Fermenting tree sap and decaying fruit",
    },
    "grasshopper": {
        "common_name": "Grasshopper",
        "scientific_name": "Caelifera",
        "taxonomy_class": TaxonomyClass.INSECTA,
        "rarity": RarityTier.COMMON,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Pastures, prairies, open savannas",
        "fun_fact": "Grasshoppers produce their signature chirping sound by rubbing their hind legs against their forewings.",
        "diet": "Grasses, leaves, and cereal crops",
    },
    "cricket": {
        "common_name": "Field Cricket",
        "scientific_name": "Gryllus",
        "taxonomy_class": TaxonomyClass.INSECTA,
        "rarity": RarityTier.COMMON,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Under stones, forest floor, domestic basements",
        "fun_fact": "Dolbear's law calculates ambient temperature based on the number of cricket chirps heard in 14 seconds.",
        "diet": "Organic plant matter, seedling shoots",
    },
    "cicada": {
        "common_name": "Periodical Cicada",
        "scientific_name": "Magicicada",
        "taxonomy_class": TaxonomyClass.INSECTA,
        "rarity": RarityTier.UNCOMMON,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Deciduous forest canopies",
        "fun_fact": "Periodical cicadas remain underground as nymphs for prime-numbered cycles (13 or 17 years) before emerging en masse.",
        "diet": "Root xylem and twig sap",
    },
    "ant": {
        "common_name": "Bullet Ant",
        "scientific_name": "Paraponera clavata",
        "taxonomy_class": TaxonomyClass.INSECTA,
        "rarity": RarityTier.RARE,
        "danger_level": DangerLevel.VENOMOUS_DANGEROUS,
        "habitat": "Neotropical rainforest understory",
        "fun_fact": "The sting of the bullet ant ranks highest on the Schmidt sting pain index, likened to being shot with a firearm.",
        "diet": "Nectar, honeydew, and small arthropods",
    },

    # -------------------------------------------------------------
    # REPTILIA (Snakes, Lizards, Crocodilians, Turtles)
    # -------------------------------------------------------------
    "green mamba": {
        "common_name": "Eastern Green Mamba",
        "scientific_name": "Dendroaspis angusticeps",
        "taxonomy_class": TaxonomyClass.REPTILIA,
        "rarity": RarityTier.LEGENDARY,
        "danger_level": DangerLevel.VENOMOUS_DANGEROUS,
        "habitat": "Coastal evergreen rainforests of southern and eastern Africa",
        "fun_fact": "Highly arboreal, green mambas blend almost seamlessly into leafy foliage and rarely touch the ground.",
        "diet": "Birds, bats, and tree-dwelling rodents",
    },
    "hognose snake": {
        "common_name": "Eastern Hognose Snake",
        "scientific_name": "Heterodon platirhinos",
        "taxonomy_class": TaxonomyClass.REPTILIA,
        "rarity": RarityTier.UNCOMMON,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Sandy soil, pine woods, open fields",
        "fun_fact": "When confronted, the hognose snake dramatically plays dead by flipping on its back, mouth open, and tongue lolling out.",
        "diet": "Toads, frogs, and salamanders",
    },
    "king snake": {
        "common_name": "California Kingsnake",
        "scientific_name": "Lampropeltis californiae",
        "taxonomy_class": TaxonomyClass.REPTILIA,
        "rarity": RarityTier.UNCOMMON,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Deserts, woodlands, river canyons",
        "fun_fact": "Kingsnakes are immune to rattlesnake venom and regularly hunt other venomous vipers.",
        "diet": "Snakes, rodents, and lizards",
    },
    "garter snake": {
        "common_name": "Common Garter Snake",
        "scientific_name": "Thamnophis sirtalis",
        "taxonomy_class": TaxonomyClass.REPTILIA,
        "rarity": RarityTier.COMMON,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Forest edges, marshes, wet meadows, backyards",
        "fun_fact": "Garter snakes are one of North America's most cold-tolerant reptiles, hibernating communally in thousands.",
        "diet": "Earthworms, slugs, amphibians",
    },
    "boa constrictor": {
        "common_name": "Boa Constrictor",
        "scientific_name": "Boa constrictor",
        "taxonomy_class": TaxonomyClass.REPTILIA,
        "rarity": RarityTier.RARE,
        "danger_level": DangerLevel.PREDATORY,
        "habitat": "Tropical rainforests and semi-arid brush",
        "fun_fact": "Boa constrictors have heat-sensing scales along their lips to detect warm-blooded prey in total darkness.",
        "diet": "Monkeys, agoutis, birds, and bats",
    },
    "chameleon": {
        "common_name": "Veiled Chameleon",
        "scientific_name": "Chamaeleo calyptratus",
        "taxonomy_class": TaxonomyClass.REPTILIA,
        "rarity": RarityTier.RARE,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Mountain plateaus and coastal valleys of Yemen and Saudi Arabia",
        "fun_fact": "Their eyes can swivel and focus independently of each other, granting a full 360-degree field of vision.",
        "diet": "Locusts, crickets, mantises, leaves",
    },
    "komodo dragon": {
        "common_name": "Komodo Dragon",
        "scientific_name": "Varanus komodoensis",
        "taxonomy_class": TaxonomyClass.REPTILIA,
        "rarity": RarityTier.LEGENDARY,
        "danger_level": DangerLevel.PREDATORY,
        "habitat": "Lesser Sunda Islands of Indonesia",
        "fun_fact": "Reaching up to 3 meters in length, they are the heaviest living lizards on Earth, equipped with venom glands.",
        "diet": "Deer, wild boars, water buffalo",
    },
    "alligator": {
        "common_name": "American Alligator",
        "scientific_name": "Alligator mississippiensis",
        "taxonomy_class": TaxonomyClass.REPTILIA,
        "rarity": RarityTier.RARE,
        "danger_level": DangerLevel.PREDATORY,
        "habitat": "Freshwater rivers, swamps, bayous, and marshes",
        "fun_fact": "Alligators have lived on Earth virtually unchanged for over 150 million years, surviving the mass extinction of dinosaurs.",
        "diet": "Fish, turtles, waterfowl, and mammals",
    },
    "iguana": {
        "common_name": "Green Iguana",
        "scientific_name": "Iguana iguana",
        "taxonomy_class": TaxonomyClass.REPTILIA,
        "rarity": RarityTier.COMMON,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Canopy layer near rivers across Central and South America",
        "fun_fact": "Iguanas have a parietal 'third eye' on top of their head that detects changes in sunlight and aerial predators.",
        "diet": "Herbivorous (leaves, flowers, fruit)",
    },
    "box turtle": {
        "common_name": "Eastern Box Turtle",
        "scientific_name": "Terrapene carolina",
        "taxonomy_class": TaxonomyClass.REPTILIA,
        "rarity": RarityTier.UNCOMMON,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Moist deciduous forests and wet pastures",
        "fun_fact": "They have a hinged plastron (lower shell) that can close completely tight like a secure lockbox against predators.",
        "diet": "Mushrooms, berries, insects, slugs",
    },
    "sea turtle": {
        "common_name": "Green Sea Turtle",
        "scientific_name": "Chelonia mydas",
        "taxonomy_class": TaxonomyClass.REPTILIA,
        "rarity": RarityTier.RARE,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Tropical and subtropical oceans and coral reefs",
        "fun_fact": "Female sea turtles navigate thousands of miles across open oceans back to the exact beach where they hatched to lay their eggs.",
        "diet": "Seagrass and marine algae",
    },

    # -------------------------------------------------------------
    # MAMMALIA (Canines, Felines, Ungulates, Primates, Rodents, etc.)
    # -------------------------------------------------------------
    "lion": {
        "common_name": "African Lion",
        "scientific_name": "Panthera leo",
        "taxonomy_class": TaxonomyClass.MAMMALIA,
        "rarity": RarityTier.LEGENDARY,
        "danger_level": DangerLevel.PREDATORY,
        "habitat": "Savannas, grasslands, and dense scrub of Sub-Saharan Africa",
        "fun_fact": "A lion's roar can reach 114 decibels and be heard up to 5 miles (8 kilometers) away.",
        "diet": "Carnivorous (zebras, wildebeests, antelopes)",
    },
    "tiger": {
        "common_name": "Bengal Tiger",
        "scientific_name": "Panthera tigris",
        "taxonomy_class": TaxonomyClass.MAMMALIA,
        "rarity": RarityTier.LEGENDARY,
        "danger_level": DangerLevel.PREDATORY,
        "habitat": "Tropical rainforests, mangrove swamps, and tall grasslands",
        "fun_fact": "No two tigers have identical stripe patterns, much like human fingerprints. Even their skin underneath is striped!",
        "diet": "Deer, wild boar, and water buffalo",
    },
    "cheetah": {
        "common_name": "Cheetah",
        "scientific_name": "Acinonyx jubatus",
        "taxonomy_class": TaxonomyClass.MAMMALIA,
        "rarity": RarityTier.EPIC,
        "danger_level": DangerLevel.PREDATORY,
        "habitat": "Open savannahs and arid plateaus",
        "fun_fact": "The fastest land animal on Earth, capable of accelerating from 0 to 60 mph in just 3 seconds.",
        "diet": "Gazelles, impalas, and hares",
    },
    "leopard": {
        "common_name": "Leopard",
        "scientific_name": "Panthera pardus",
        "taxonomy_class": TaxonomyClass.MAMMALIA,
        "rarity": RarityTier.EPIC,
        "danger_level": DangerLevel.PREDATORY,
        "habitat": "Sub-Saharan Africa, Central Asia, and India",
        "fun_fact": "Leopards are extraordinarily powerful climbers and often hoist prey heavier than themselves high into tree branches.",
        "diet": "Antelope, monkeys, rodents",
    },
    "wolf": {
        "common_name": "Gray Wolf",
        "scientific_name": "Canis lupus",
        "taxonomy_class": TaxonomyClass.MAMMALIA,
        "rarity": RarityTier.UNCOMMON,
        "danger_level": DangerLevel.PREDATORY,
        "habitat": "Tundra, boreal forests, grasslands, and mountain ranges",
        "fun_fact": "Wolves possess an acute sense of smell roughly 100 times keener than humans, detecting scents miles away.",
        "diet": "Elk, moose, deer, and bison",
    },
    "fox": {
        "common_name": "Red Fox",
        "scientific_name": "Vulpes vulpes",
        "taxonomy_class": TaxonomyClass.MAMMALIA,
        "rarity": RarityTier.COMMON,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Mixed forests, farm fields, urban parks worldwide",
        "fun_fact": "Red foxes use Earth's magnetic field to accurately pounce on small rodents buried beneath deep snow.",
        "diet": "Rodents, birds, berries, and fruits",
    },
    "elephant": {
        "common_name": "African Bush Elephant",
        "scientific_name": "Loxodonta africana",
        "taxonomy_class": TaxonomyClass.MAMMALIA,
        "rarity": RarityTier.LEGENDARY,
        "danger_level": DangerLevel.PREDATORY,
        "habitat": "Savannas, grasslands, and dense woodlands of Africa",
        "fun_fact": "An elephant's trunk has over 40,000 distinct muscles and can lift over 300 kilograms or delicately pick up a single peanut.",
        "diet": "Grasses, leaves, tree bark, and roots",
    },
    "bear": {
        "common_name": "Grizzly Bear",
        "scientific_name": "Ursus arctos horribilis",
        "taxonomy_class": TaxonomyClass.MAMMALIA,
        "rarity": RarityTier.RARE,
        "danger_level": DangerLevel.PREDATORY,
        "habitat": "Boreal forests, subalpine meadows, and river systems",
        "fun_fact": "During hyperphagia before hibernation, a grizzly bear can eat up to 40 kg of food every single day.",
        "diet": "Salmon, berries, roots, and ungulates",
    },
    "squirrel": {
        "common_name": "Eastern Gray Squirrel",
        "scientific_name": "Sciurus carolinensis",
        "taxonomy_class": TaxonomyClass.MAMMALIA,
        "rarity": RarityTier.COMMON,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Oak-hickory forests, suburban parks, and urban canopies",
        "fun_fact": "Squirrels inadvertently plant millions of trees every year by burying nuts and forgetting their exact locations.",
        "diet": "Acorns, seeds, nuts, and tree buds",
    },
    "rabbit": {
        "common_name": "European Rabbit",
        "scientific_name": "Oryctolagus cuniculus",
        "taxonomy_class": TaxonomyClass.MAMMALIA,
        "rarity": RarityTier.COMMON,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Meadows, scrublands, dunes, and open woodlands",
        "fun_fact": "A happy rabbit performs an ecstatic mid-air twisting leap known as a 'binky'.",
        "diet": "Grasses, clover, and tender herbs",
    },
    "deer": {
        "common_name": "White-tailed Deer",
        "scientific_name": "Odocoileus virginianus",
        "taxonomy_class": TaxonomyClass.MAMMALIA,
        "rarity": RarityTier.COMMON,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Forest edges, farmlands, and brushy terrain",
        "fun_fact": "They flash the stark white underside of their tail as an alarm signal ('flagging') to alert the rest of their herd.",
        "diet": "Twigs, tender shoots, grasses, and acorns",
    },
    "domestic cat": {
        "common_name": "Domestic Cat",
        "scientific_name": "Felis catus",
        "taxonomy_class": TaxonomyClass.MAMMALIA,
        "rarity": RarityTier.COMMON,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Human settlements and households globally",
        "fun_fact": "Cats can make over 100 vocal sounds and communicate almost exclusively through meows toward humans, rarely each other.",
        "diet": "Obligate carnivore",
    },
    "golden retriever": {
        "common_name": "Domestic Dog (Golden Retriever)",
        "scientific_name": "Canis lupus familiaris",
        "taxonomy_class": TaxonomyClass.MAMMALIA,
        "rarity": RarityTier.COMMON,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Human households globally",
        "fun_fact": "A dog's nose print is completely unique, just like human fingerprints, and can be used for biometric identification.",
        "diet": "Omnivorous",
    },
}

# Broader keyword lists to classify any ImageNet label into our 4 taxonomy buckets
TAXONOMY_KEYWORDS = {
    TaxonomyClass.ARACHNIDA: [
        "spider", "tarantula", "scorpion", "tick", "mite", "arachnid", "harvestman",
        "black and gold garden spider", "barn spider", "garden spider", "wolf spider"
    ],
    TaxonomyClass.INSECTA: [
        "insect", "butterfly", "moth", "beetle", "ant", "bee", "wasp", "mantis",
        "dragonfly", "damselfly", "cricket", "grasshopper", "cicada", "ladybug",
        "ladybeetle", "fly", "mosquito", "flea", "locust", "caterpillar", "centipede",
        "lacewing", "termite", "cockroach"
    ],
    TaxonomyClass.REPTILIA: [
        "reptile", "snake", "lizard", "gecko", "chameleon", "alligator", "crocodile",
        "turtle", "tortoise", "terrapin", "viper", "python", "cobra", "mamba", "boa",
        "iguana", "komodo", "skink", "constrictor", "sidewinder", "rattlesnake"
    ],
    TaxonomyClass.MAMMALIA: [
        "mammal", "dog", "cat", "lion", "tiger", "bear", "wolf", "fox", "elephant",
        "deer", "horse", "cow", "sheep", "goat", "pig", "rabbit", "hare", "squirrel",
        "mouse", "rat", "monkey", "ape", "chimpanzee", "gorilla", "whale", "dolphin",
        "seal", "otter", "badger", "beaver", "kangaroo", "koala", "panda", "cheetah",
        "leopard", "jaguar", "hyena", "zebra", "giraffe", "hippopotamus", "rhino",
        "retriever", "terrier", "spaniel", "hound", "shepherd", "collie", "bulldog"
    ]
}


def resolve_taxonomy_and_metadata(raw_label: str) -> Dict[str, Any]:
    """
    Translates an ImageNet label or model output into our target 4 taxonomy classes:
    Mammalia, Insecta, Reptilia, Arachnida, with detailed biological metadata.
    """
    clean_label = raw_label.lower().strip().replace("_", " ")

    # 1. Direct dictionary match
    for key, data in SPECIES_TAXONOMY_MAP.items():
        if key in clean_label or clean_label in key:
            return data

    # 2. Heuristic keyword classification
    detected_class = TaxonomyClass.OTHER
    for tax_class, keywords in TAXONOMY_KEYWORDS.items():
        for kw in keywords:
            if kw in clean_label:
                detected_class = tax_class
                break
        if detected_class != TaxonomyClass.OTHER:
            break

    # Format human-friendly names
    title_common = clean_label.title()
    if detected_class == TaxonomyClass.OTHER:
        # Fallback to Mammalia if typical domestic animal or unknown vertebrate
        detected_class = TaxonomyClass.MAMMALIA

    return {
        "common_name": title_common,
        "scientific_name": f"{title_common.replace(' ', '')} sp.",
        "taxonomy_class": detected_class,
        "rarity": RarityTier.COMMON,
        "danger_level": DangerLevel.HARMLESS,
        "habitat": "Temperate wilderness and varied landscapes",
        "fun_fact": f"A remarkable member of the {detected_class.value} class registered in your WildGotcha Dex.",
        "diet": "Specialized diet",
    }
