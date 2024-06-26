import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { UnlimitedAuction } from '../target/types/unlimited_auction';
import {
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
    TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
    getAccount,
    getAssociatedTokenAddressSync,
} from '@solana/spl-token';

describe('unlimited-auction', () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const payer = provider.wallet as anchor.Wallet;
    const program = anchor.workspace.UnlimitedAuction;

    const collectionMetadata = {
        name: 'Collection1',
        symbol: 'CXYZ',
        uri: 'collectionxyz',
    };

    const metadata = {
        name: 'XYZ',
        symbol: 'ABC',
        uri: 'abcxyz',
    };

    const bidderSecretKey = Uint8Array.from([
        42, 165, 245, 159, 222, 186, 30, 59, 255, 159, 113, 47, 54, 124, 76,
        163, 43, 196, 84, 5, 49, 170, 50, 11, 138, 41, 232, 148, 12, 220, 123,
        134, 132, 67, 120, 119, 74, 89, 31, 50, 157, 152, 126, 40, 40, 244, 236,
        21, 66, 18, 70, 7, 224, 123, 171, 16, 156, 248, 229, 104, 156, 119, 255,
        160,
    ]);
    const bidderKeypair = Keypair.fromSecretKey(bidderSecretKey);

    const bidder2SecretKey = Uint8Array.from([
        24, 61, 14, 75, 29, 10, 156, 194, 215, 174, 18, 241, 234, 122, 27, 57,
        186, 255, 114, 166, 201, 67, 70, 89, 40, 15, 223, 90, 37, 153, 39, 67,
        15, 144, 208, 182, 109, 93, 137, 191, 23, 156, 18, 191, 62, 213, 60,
        210, 205, 110, 177, 37, 70, 135, 160, 41, 1, 177, 133, 182, 134, 143,
        219, 182,
    ]);
    const bidder2Keypair = Keypair.fromSecretKey(bidder2SecretKey);

    let collectionMintKeyPair: Keypair;
    let mintKeyPair: Keypair;
    let startTime: number;
    let endTime: number;

    it('Mint Collection', async () => {
        collectionMintKeyPair = Keypair.generate();

        const collectionAssociatedTokenAccountAddress =
            getAssociatedTokenAddressSync(
                collectionMintKeyPair.publicKey,
                payer.publicKey
            );

        const collectionTransactionSignature = await program.methods
            .mintCollection(
                collectionMetadata.name,
                collectionMetadata.symbol,
                collectionMetadata.uri
            )
            .accounts({
                payer: payer.publicKey,
                collectionMintAccount: collectionMintKeyPair.publicKey,
                collectionAssociatedTokenAccount:
                    collectionAssociatedTokenAccountAddress,
            })
            .signers([collectionMintKeyPair])
            .rpc({ skipPreflight: true });

        console.log('Collection created');
        console.log('Transaction signature', collectionTransactionSignature);
    });

    it('Mint Nft with collections', async () => {
        mintKeyPair = Keypair.generate();

        const associatedTokenAccountAddress = getAssociatedTokenAddressSync(
            mintKeyPair.publicKey,
            payer.publicKey
        );

        const transactionSignature = await program.methods
            .mintNft(
                metadata.name,
                metadata.symbol,
                metadata.uri,
                collectionMintKeyPair.publicKey
            )
            .accounts({
                payer: payer.publicKey,
                mintAccount: mintKeyPair.publicKey,
                associatedTokenAccount: associatedTokenAccountAddress,
                collectionMetadata: collectionMintKeyPair.publicKey,
            })
            .signers([mintKeyPair])
            .rpc({ skipPreflight: true });

        console.log('NFT minted');
        console.log('Transaction signature', transactionSignature);
    });

    it('Start auction', async () => {
        const sellerTokenAccount = getAssociatedTokenAddressSync(
            mintKeyPair.publicKey,
            payer.publicKey
        );

        const [pdaAccount, bump] = PublicKey.findProgramAddressSync(
            [Buffer.from('sale'), mintKeyPair.publicKey.toBuffer()],
            program.programId
        );

        const pdaTokenAccountAddress = getAssociatedTokenAddressSync(
            mintKeyPair.publicKey,
            pdaAccount,
            true
        );

        const createPdaTokenAccountIx = createAssociatedTokenAccountInstruction(
            payer.publicKey,
            pdaTokenAccountAddress,
            pdaAccount,
            mintKeyPair.publicKey
        );

        const currentTimestamp = Math.floor(Date.now() / 1000);
        startTime = currentTimestamp;

        const startPrice = new anchor.BN(1000000000);

        const transactionSignature = await program.methods
            .startAuction(new anchor.BN(startTime), startPrice)
            .accounts({
                seller: payer.publicKey,
                sellerTokenAccount: sellerTokenAccount,
                pdaAccount,
                pdaTokenAccount: pdaTokenAccountAddress,
                mint: mintKeyPair.publicKey,
                pdaSigner: pdaAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .preInstructions([createPdaTokenAccountIx])
            .signers([])
            .rpc({ skipPreflight: true });

        console.log('Auction started');
        console.log('Transaction signature', transactionSignature);
    });

    it('Place bid bidder 1', async () => {
        const [pdaAccount] = PublicKey.findProgramAddressSync(
            [Buffer.from('sale'), mintKeyPair.publicKey.toBuffer()],
            program.programId
        );

        const bidAmount = new anchor.BN(2000000000);

        const transactionSignature = await program.methods
            .placeBid(bidAmount)
            .accounts({
                bidder: bidderKeypair.publicKey,
                pdaAccount: pdaAccount,
            })
            .signers([bidderKeypair])
            .rpc({ skipPreflight: true });

        console.log('Bidder 1 has placed bid');
        console.log('Transaction signature', transactionSignature);

        // const auctionState = await program.account.auction.fetch(pdaAccount);
        // console.log('Auction State:', auctionState);
    });

    it('Place bid bidder 2', async () => {
        const [pdaAccount] = PublicKey.findProgramAddressSync(
            [Buffer.from('sale'), mintKeyPair.publicKey.toBuffer()],
            program.programId
        );

        const bidAmount = new anchor.BN(3000000000);

        const transactionSignature = await program.methods
            .placeBid(bidAmount)
            .accounts({
                bidder: bidder2Keypair.publicKey,
                pdaAccount: pdaAccount,
            })
            .signers([bidder2Keypair])
            .rpc({ skipPreflight: true });

        console.log('Bidder 2 has placed bid');
        console.log('Transaction signature', transactionSignature);

        // const auctionState = await program.account.auction.fetch(pdaAccount);
        // console.log('Auction State:', auctionState);
    });

    it('Accept the bid', async () => {
        const sellerTokenAccount = getAssociatedTokenAddressSync(
            mintKeyPair.publicKey,
            payer.publicKey
        );

        const [pdaAccount, bump] = PublicKey.findProgramAddressSync(
            [Buffer.from('sale'), mintKeyPair.publicKey.toBuffer()],
            program.programId
        );

        const pdaTokenAccountAddress = getAssociatedTokenAddressSync(
            mintKeyPair.publicKey,
            pdaAccount,
            true
        );

        const selectedBidderTokenAccountAddress = getAssociatedTokenAddressSync(
            mintKeyPair.publicKey,
            bidder2Keypair.publicKey
        );

        const pdaTokenAccountInfo = await getAccount(
            provider.connection,
            pdaTokenAccountAddress
        ).catch(async () => {
            const createPdaTokenAccountIx =
                createAssociatedTokenAccountInstruction(
                    payer.publicKey,
                    pdaTokenAccountAddress,
                    pdaAccount,
                    mintKeyPair.publicKey
                );

            const transaction = new Transaction().add(createPdaTokenAccountIx);
            await sendAndConfirmTransaction(provider.connection, transaction, [
                payer.payer,
            ]);
        });

        const bidderTokenAccountInfo = await getAccount(
            provider.connection,
            selectedBidderTokenAccountAddress
        ).catch(async () => {
            const createHighestBidderTokenAccountIx =
                createAssociatedTokenAccountInstruction(
                    payer.publicKey,
                    selectedBidderTokenAccountAddress,
                    bidder2Keypair.publicKey,
                    mintKeyPair.publicKey
                );

            const transaction = new Transaction().add(
                createHighestBidderTokenAccountIx
            );
            await sendAndConfirmTransaction(provider.connection, transaction, [
                payer.payer,
            ]);
        });

        try {
            const transactionSignature = await program.methods
                .acceptBid(bidder2Keypair.publicKey)
                .accounts({
                    seller: payer.publicKey,
                    winningBidder: bidder2Keypair.publicKey,
                    pdaAccount: pdaAccount,
                    pdaTokenAccount: pdaTokenAccountAddress,
                    pdaSigner: pdaAccount,
                    winningBidderTokenAccount:
                        selectedBidderTokenAccountAddress,
                    mint: mintKeyPair.publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .signers([payer.payer, bidder2Keypair])
                .rpc({ skipPreflight: true });

            console.log('Auction ended');
            console.log('Transaction signature', transactionSignature);
        } catch (error) {
            console.log(error);
        }
    });

    it('Reject bid', async () => {
        const [pdaAccount, bump] = PublicKey.findProgramAddressSync(
            [Buffer.from('sale'), mintKeyPair.publicKey.toBuffer()],
            program.programId
        );

        try {
            const transactionSignature = await program.methods
                .rejectBid(bidderKeypair.publicKey)
                .accounts({
                    seller: payer.publicKey,
                    pdaAccount: pdaAccount,
                })
                .signers([payer.payer])
                .rpc({ skipPreflight: true });

            console.log('Bid rejected');
            console.log('Transaction signature', transactionSignature);
        } catch (error) {
            console.log(error);
        }
    });

    it('Withdraw bid', async () => {
        const [pdaAccount, bump] = PublicKey.findProgramAddressSync(
            [Buffer.from('sale'), mintKeyPair.publicKey.toBuffer()],
            program.programId
        );

        try {
            const transactionSignature = await program.methods
                .withdrawBid()
                .accounts({
                    bidder: bidderKeypair.publicKey,
                    pdaAccount: pdaAccount,
                })
                .signers([bidderKeypair])
                .rpc({ skipPreflight: true });

            console.log('Bid withdrawn');
            console.log('Transaction signature', transactionSignature);
        } catch (error) {
            console.log(error);
        }
    });

    it('Cancel auction', async () => {
        const sellerTokenAccount = getAssociatedTokenAddressSync(
            mintKeyPair.publicKey,
            payer.publicKey
        );

        const [pdaAccount, bump] = PublicKey.findProgramAddressSync(
            [Buffer.from('sale'), mintKeyPair.publicKey.toBuffer()],
            program.programId
        );

        const pdaTokenAccountAddress = getAssociatedTokenAddressSync(
            mintKeyPair.publicKey,
            pdaAccount,
            true
        );

        try {
            const transactionSignature = await program.methods
                .cancelAuction()
                .accounts({
                    seller: payer.publicKey,
                    sellerTokenAccount: sellerTokenAccount,
                    pdaAccount: pdaAccount,
                    pdaTokenAccount: pdaTokenAccountAddress,
                    pdaSigner: pdaAccount,
                    mint: mintKeyPair.publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .signers([])
                .rpc({ skipPreflight: true });

            console.log('Auction canceled');
            console.log('Transaction signature', transactionSignature);
        } catch (error) {
            console.error('Failed to cancel auction:', error);
        }
    });
});
