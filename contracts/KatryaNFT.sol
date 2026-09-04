// =============================================================================
// ATTENTION - CE FICHIER N'EST PAS LE CONTRAT REELLEMENT DEPLOYE
//
// Le contrat en production sur Polygon Mainnet se trouve a l'adresse
// 0x21fE295A01907b1e2C513BA64dB82Cc816dAad8C (source verifiee sur Polygonscan)
// et expose une surface plus reduite que ce fichier :
//
//   - mint(address to, string tokenURI) returns (uint256)  <- seule fonction de mint
//   - totalSupply()
//   - owner() / transferOwnership(address) / renounceOwnership()
//   - l'ERC-721 standard (safeTransferFrom, tokenURI, ownerOf, ...)
//
// Il n'a NI mintWithId, NI updateTokenURI, NI exists(), NI les evenements
// KatrYaMinted / KatryaTransferred definis plus bas. Son nom on-chain est
// "KATRYA Product Passport" (symbole "KATRYA"). Son compteur est post-incremente :
// le premier token porte l'id 0, pas 1.
//
// Consequence pratique : les metadonnees d'un token deja minte ne peuvent plus
// etre modifiees on-chain. C'est pourquoi le tokenURI grave au mint pointe vers
// /api/nft/metadata/by-katrya-id/[katryaId], servi en direct par l'app.
//
// Ce fichier reste la reference de conception. Pour construire un ABI, utiliser
// celui publie sur Polygonscan, pas celui-ci.
// =============================================================================

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title KatryaNFT
 * @notice Contrat ERC-721 pour les passeports numériques KATRYA.
 * @dev Chaque token représente un article de mode authentifié par puce NFC.
 *      Le tokenURI est une URL publique vers l'API KATRYA (metadata JSON).
 *      Déployé sur Polygon Mainnet.
 */

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract KatryaNFT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;

    // Événement émis à chaque mint
    event KatrYaMinted(
        uint256 indexed tokenId,
        address indexed to,
        string katryaId,
        string tokenURI
    );

    // Événement émis à chaque transfert de propriété
    event KatryaTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to
    );

    constructor()
        ERC721("KATRYA Passport", "KTR")
        Ownable(msg.sender)
    {}

    /**
     * @notice Mint un nouveau passeport NFT KATRYA
     * @param to Adresse du destinataire (admin KATRYA au départ)
     * @param uri URL des métadonnées JSON (ex: https://katrya-app.vercel.app/api/nft/metadata/{tokenId})
     * @return tokenId L'identifiant du token créé
     */
    function mint(address to, string memory uri)
        public
        onlyOwner
        returns (uint256)
    {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _mint(to, newTokenId);
        _setTokenURI(newTokenId, uri);
        emit KatrYaMinted(newTokenId, to, "", uri);
        return newTokenId;
    }

    /**
     * @notice Mint avec identifiant KATRYA stocké en événement
     * @param to Adresse du destinataire
     * @param uri URL des métadonnées JSON
     * @param katryaId Identifiant KATRYA (ex: KTR-0042)
     * @return tokenId L'identifiant du token créé
     */
    function mintWithId(
        address to,
        string memory uri,
        string memory katryaId
    ) public onlyOwner returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _mint(to, newTokenId);
        _setTokenURI(newTokenId, uri);
        emit KatrYaMinted(newTokenId, to, katryaId, uri);
        return newTokenId;
    }

    /**
     * @notice Retourne le nombre total de tokens mintés
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIds.current();
    }

    /**
     * @notice Override pour émettre un événement custom lors du transfert
     */
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 /* batchSize */
    ) internal override {
        super._afterTokenTransfer(from, to, tokenId, 1);
        if (from != address(0) && to != address(0)) {
            emit KatryaTransferred(tokenId, from, to);
        }
    }

    /**
     * @notice Permet au propriétaire du contrat de mettre à jour un tokenURI
     * @dev Utile si l'URL de l'API change
     */
    function updateTokenURI(uint256 tokenId, string memory newUri)
        public
        onlyOwner
    {
        require(_exists(tokenId), "KatryaNFT: token inexistant");
        _setTokenURI(tokenId, newUri);
    }

    /**
     * @notice Vérifie si un tokenId est valide
     */
    function exists(uint256 tokenId) public view returns (bool) {
        return _exists(tokenId);
    }
}
